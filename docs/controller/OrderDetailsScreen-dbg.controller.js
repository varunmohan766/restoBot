sap.ui.define([
    "sap/ui/core/mvc/Controller",
    "sap/m/MessageToast",
    "sap/ui/core/Fragment"
], function (Controller, MessageToast, Fragment) {
    "use strict";

    return Controller.extend("com.bot.resto.restaurantbot.controller.OrderDetailsScreen", {

        onInit: function () {
            const sMyToken = this.getOwnerComponent().getModel().getProperty("/myToken");
            if (!sMyToken) {
                this.getOwnerComponent().getRouter().navTo("login");
            }
            this.getOwnerComponent().getRouter().getRoute("detail").attachPatternMatched(this._onMatched, this);
            window.addEventListener("popstate", this.onClose.bind(this));
        },

        _onMatched: function (oEvent) {
            const sId = oEvent.getParameter("arguments").id;
            this.getView().bindElement("/Orders/" + sId);
            this.getView().getModel().setProperty("/isEditMode", false);
        },

        onClose: function () {
            this.getOwnerComponent().getModel("layout").setProperty("/layout", "OneColumn");
        },

        onAccept: function () {
            const sPath = this.getView().getBindingContext().getPath();
            this.updateBackendStatus(sPath, "Accepted");
        },

        onReject: function () {
            const sPath = this.getView().getBindingContext().getPath();
            this.updateBackendStatus(sPath, "Rejected");
        },

        onComplete: function () {
            const sPath = this.getView().getBindingContext().getPath();
            this.updateBackendStatus(sPath, "Completed");
        },

        updateBackendStatus: function (sPath, sStatus) {
            const oMainModel = this.getOwnerComponent().getModel();
            const sMyToken = oMainModel.getProperty("/myToken");
            const oOrderStatus = oMainModel.getProperty("/OrderStatus");
            const oModel = this.getView().getModel();
            const orderId = oModel.getProperty(sPath + '/id');
            const url = oMainModel.getProperty("/api") + "statusUpdate/" + orderId;
            fetch(url, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    "Authorization": "Bearer " + sMyToken
                },
                body: JSON.stringify({ status: sStatus, filterOrderStatus: oOrderStatus })
            })
                .then(response => {
                    if (!response.ok) {
                        throw new Error('Network response was not ok');
                    }
                    return response.json();
                })
                .then(data => {
                    console.log('Backend updated successfully:');
                    this.getOwnerComponent().getModel().setProperty("/Orders", data.orderList);
                    if (sStatus === "Completed" || sStatus === "Rejected") {
                        this.onClose();
                    }
                })
                .catch(error => {
                    console.error('Error updating backend:', error);
                });
        },

        onEdit: function () {
            this.getView().getModel().setProperty("/isEditMode", true);
            var oMainModel = this.getOwnerComponent().getModel();
            let oOriginalEditingItem = oMainModel.getProperty(this.getView().getBindingContext().getPath());

            oMainModel.setProperty("/OriginalEditingItem", structuredClone(oOriginalEditingItem));
            this._aCreate = [];
            this._aDelete = [];
            this._aUpdate = [];
        },

        onAddItem: function () {
            const oMainModel = this.getOwnerComponent().getModel();
            const aItems = oMainModel.getProperty(this.getView().getBindingContext().getPath()).items;

            const oNewItem = {
                id: "",
                isReady: false,
                name: "",
                price: 0,
                qty: 0,
                total: 0,
                inventory_id: 1,
                _idNew: this._aCreate[this._aCreate.length - 1]?._idNew + 1 || 0
            };
            aItems.push(oNewItem);
            this._aCreate.push(oNewItem);
            oMainModel.refresh(true);
        },

        _FieldChange: function (oRow) {
            oRow.total = oRow.price * oRow.qty;
            const aItems = this.getView().getBindingContext().getObject().items;
            const totalPrice = aItems.reduce((sum, item) => { return sum + Number(item.total || 0); }, 0);
            this.getView().getBindingContext().getObject().totalAmount = totalPrice;
            this.getOwnerComponent().getModel().refresh();
            if (Object.hasOwn(oRow, '_idNew')) {
                return;
            } else {
                const iIndex = this._aUpdate.findIndex(item => item.id === oRow.id);

                if (iIndex === -1) {
                    this._aUpdate.push(structuredClone(oRow));
                } else {
                    this._aUpdate[iIndex] = structuredClone(oRow);
                }
            }
        },

        onItemChange: function (oEvent) {
            const oContext = oEvent.getSource().getBindingContext();
            const oRow = oContext.getObject();
            const aItems = this.getView().getModel().getProperty("/stockList") || [];

            const bValid = aItems.some(function (oItem) {
                return oItem.Name === oRow.name;
            });

            if (!bValid) {
                oEvent.getSource().setValue("");
                oEvent.getSource().setValueState("Error");
                oEvent.getSource().setValueStateText("Please select a value using Value Help");
            } else {
                oEvent.getSource().setValueState("None");
                this._FieldChange(oRow);
            }
        },

        onQtyChange: function (oEvent) {
            const oContext = oEvent.getSource().getBindingContext();
            const oRow = oContext.getObject();
            this._FieldChange(oRow);
        },

        onDeleteItem: function (oEvent) {
            const oMainModel = this.getOwnerComponent().getModel();
            const oContext = oEvent.getSource().getBindingContext();
            const oRow = oContext.getObject();
            const sPath = oContext.getPath();
            const iIndex = Number(sPath.split("/")[4]);
            const aItems = oMainModel.getProperty(this.getView().getBindingContext().getPath()).items;

            if (Object.hasOwn(oRow, '_idNew')) {
                this._aCreate = this._aCreate.filter(item => item._idNew !== oRow._idNew);
            } else {
                const bExists = this._aDelete.some(item => item.id === oRow.id);

                if (!bExists) {
                    this._aDelete.push({
                        id: oRow.id,
                        inventory_id: oRow.inventory_id
                    });
                }
                this._aUpdate = this._aUpdate.filter(item => item.id !== oRow.id);
            }

            aItems.splice(iIndex, 1);
            oMainModel.refresh(true);
        },
        onSave: async function () {
            const oMainModel = this.getOwnerComponent().getModel();
            const sMyToken = oMainModel.getProperty("/myToken");
            const oOrderStatus = oMainModel.getProperty("/OrderStatus");
            if (this._aCreate.length === 0 && this._aUpdate.length === 0 && this._aDelete.length === 0) {
                MessageToast.show("No changes");
                return;
            }
            const oPayload = {
                create: this._aCreate,
                update: this._aUpdate,
                delete: this._aDelete,
                filterOrderStatus: oOrderStatus
            };
            const orderId = this.getView().getBindingContext().getObject().id;
            const url = oMainModel.getProperty("/api") + "orderItemBatch/" + orderId;
            fetch(url, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    "Authorization": "Bearer " + sMyToken
                },
                body: JSON.stringify(oPayload)
            })
                .then(response => {
                    if (!response.ok) {
                        throw new Error('Network response was not ok');
                    }
                    return response.json();
                })
                .then(data => {
                    MessageToast.show("Saved");
                    this.getView().getModel().setProperty("/isEditMode", false);
                    oMainModel.setProperty("/Orders", data.orderList);
                })
                .catch(error => {
                    console.error('Error updating backend:', error);
                });
        },
        onCancel: function () {
            var oMainModel = this.getOwnerComponent().getModel();
            let oOriginalEditingItem = oMainModel.getProperty("/OriginalEditingItem");
            // this._aCreate = [];
            // this._aUpdate = [];
            // this._aDelete = [];
            this.getView().getModel().setProperty("/isEditMode", false);
            oMainModel.setProperty(this.getView().getBindingContext().getPath(), structuredClone(oOriginalEditingItem));
        },
        onChangeisReady: function (oEvent) {
            const oMainModel = this.getOwnerComponent().getModel();
            const sMyToken = oMainModel.getProperty("/myToken");
            const oChangeItem = oEvent.getSource().getBindingContext().getObject();
            const url = oMainModel.getProperty("/api") + "updateIsReady/" + oChangeItem.id;

            fetch(url, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    "Authorization": "Bearer " + sMyToken
                },
                body: JSON.stringify({ isReady: oChangeItem.isReady })
            })
                .then(response => {
                    if (!response.ok) {
                        throw new Error('Network response was not ok');
                    }
                    return response.json();
                })
                .then(data => {
                    MessageToast.show("Saved");
                })
                .catch(error => {
                    console.error('Error updating backend:', error);
                });
        },

        onNameValueHelp: async function (oEvent) {
            var oSource = oEvent.getSource();
            this._sSelectedRowPath = oSource.getBindingContext().getPath();

            // If dialog not yet loaded, load it asynchronously
            if (!this._oValueHelpDialog) {
                this._oValueHelpDialog = await Fragment.load({
                    id: this.getView().getId(),   // ensures unique IDs
                    name: "com.bot.resto.restaurantbot.fragments.FoodListVHelp", // fragment path
                    controller: this
                });
                this.getView().addDependent(this._oValueHelpDialog);
            }
            // Already loaded, just refresh data and open
            await this._loadStockData();
            this._oValueHelpDialog.open();
        },

        // Separate function to fetch backend data
        _loadStockData: async function () {
            const oMainModel = this.getOwnerComponent().getModel();
            const sMyToken = oMainModel.getProperty("/myToken");
            const url = oMainModel.getProperty("/api") + "stockList";

            await fetch(url, {
                method: "GET",
                headers: {
                    "Authorization": "Bearer " + sMyToken
                }
            })
                .then(res => res.json())
                .then(data => {
                    this.getView().getModel().setProperty("/stockList", data.stockList);
                })
                .catch(() => {
                    MessageToast.show("Failed to load data");
                });
        },

        onCloseValueHelp: function () {
            this._oValueHelpDialog.close();
        },

        onSelectFood: function (oEvent) {
            var selectedObj = oEvent.getSource().getBindingContext().getObject();
            var oModel = this.getView().getModel();

            oModel.setProperty(this._sSelectedRowPath + "/name", selectedObj.Name);
            oModel.setProperty(this._sSelectedRowPath + "/price", selectedObj.Price);
            oModel.setProperty(this._sSelectedRowPath + "/inventory_id", selectedObj.id);

            this._oValueHelpDialog.close();
            this._FieldChange(oModel.getProperty(this._sSelectedRowPath));
        }
    });
});