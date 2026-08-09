sap.ui.define([
    "sap/ui/core/mvc/Controller",
    "sap/m/MessageToast"
], function (Controller, MessageToast) {
    "use strict";

    return Controller.extend("com.bot.resto.restaurantbot.controller.OrderDetailsScreen", {

        onInit: function () {
            this.getOwnerComponent()
                .getRouter()
                .getRoute("detail")
                .attachPatternMatched(this._onMatched, this);
                window.addEventListener("popstate", this.onClose.bind(this));
        },

        _onMatched: function (oEvent) {

            const sId = oEvent.getParameter("arguments").id;
            this.getView().bindElement("/Orders/"+sId);
            this.getView().getModel().setProperty("/isEditMode", false);

            // const oModel = this.getOwnerComponent().getModel();
            // const aOrders = oModel.getProperty("/Orders");

            // // ✅ FIND ORDER CORRECTLY
            // const oOrder = aOrders.find(o => o.id == sId);

            // if (!oOrder) {
            //     console.error("Order not found");
            //     return;
            // }

            // ✅ BIND ELEMENT (IMPORTANT)
            
            // this.getView().setModel(new sap.ui.model.json.JSONModel(oOrder),"detailModel");

        },

        onClose: function () {
            this.getOwnerComponent()
                .getModel("layout")
                .setProperty("/layout", "OneColumn");
        },
        onAccept: function () {
            const oModel = this.getView().getModel();
            const sPath = this.getView().getBindingContext().getPath();
            // oModel.setProperty(sPath+'/status',"Accepted");//only for UI update, not for backend

            this.updateBackendStatus(sPath, "Accepted");
        },
        onReject: function () {
            const oModel = this.getView().getModel();
            // const aOrders = oModel.getProperty("/Orders");
            const sPath = this.getView().getBindingContext().getPath();
            // oModel.setProperty(sPath+'/status',"Rejected");//only for UI update, not for backend
//need an API call to update the backend with the new status
            this.updateBackendStatus(sPath, "Rejected");
        },
        onComplete: function () {
            const oModel = this.getView().getModel();
            const sPath = this.getView().getBindingContext().getPath();
            // oModel.setProperty(sPath+'/status',"Completed");//only for UI update, not for backend
//need an API call to update the backend with the new status
            this.updateBackendStatus(sPath, "Completed");
        },
        updateBackendStatus: function (sPath, sStatus) {
            // Implement the API call to update the backend with the new status
            // Example using fetch:
            const oMainModel = this.getOwnerComponent().getModel();
            const sMyToken = oMainModel.getProperty("/myToken");
            const oOrderStatus = oMainModel.getProperty("/OrderStatus");
            const oModel = this.getView().getModel();
            const orderId = oModel.getProperty(sPath + '/id');
            const url = oMainModel.getProperty("/api")+"orderDetails/"+orderId;
            fetch(url, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    "Authorization": "Bearer " + sMyToken
                },
                body: JSON.stringify({ status: sStatus, filterOrderStatus: oOrderStatus})
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
        onAddItem: function() {
            const oMainModel = this.getOwnerComponent().getModel();
            const aItems =  oMainModel.getProperty(this.getView().getBindingContext().getPath()).items;

            const oNewItem = {
                id : "",
                isReady: false,
                name : "",
                price : 0,
                qty: 0,
                total: 0,
                inventory_id: 1,
                _idNew: this._aCreate[this._aCreate.length-1]?._idNew + 1 || 0
            };
            aItems.push(oNewItem);
            this._aCreate.push(oNewItem);
            oMainModel.refresh(true);
        },
        onFieldChange: function(oEvent) {
            const oContext = oEvent.getSource().getBindingContext();
            const oRow = oContext.getObject();
            if(Object.hasOwn(oRow, '_idNew')){
                return;
                /*const iIndex = this._aUpdate.findIndex(item => item._idNew === oRow._idNew);

                if (iIndex === -1) {
                    this._aUpdate.push(structuredClone(oRow));
                } else {
                    this._aUpdate[iIndex] = structuredClone(oRow);
                }*/
            } else {
                const iIndex = this._aUpdate.findIndex(item => item.id === oRow.id);

                if (iIndex === -1) {
                    this._aUpdate.push(structuredClone(oRow));
                } else {
                    this._aUpdate[iIndex] = structuredClone(oRow);
                }
            }            
        },
        onDeleteItem: function(oEvent) {
            const oMainModel = this.getOwnerComponent().getModel();
            const oContext = oEvent.getSource().getBindingContext();
            const oRow = oContext.getObject();

            const sPath = oContext.getPath();

            const iIndex = Number(sPath.split("/")[4]);
            const aItems =  oMainModel.getProperty(this.getView().getBindingContext().getPath()).items;
            

            if (Object.hasOwn(oRow, '_idNew')) {
                this._aCreate = this._aCreate.filter( item => item._idNew !== oRow._idNew);
            } else {
                const bExists = this._aDelete.some( item => item.id === oRow.id);

                if (!bExists) {
                    this._aDelete.push({
                        id: oRow.id,
                        inventory_id:oRow.inventory_id
                    });
                }
                this._aUpdate = this._aUpdate.filter( item => item.id !== oRow.id);
            }

            aItems.splice(iIndex, 1);
            oMainModel.refresh(true);
        },
        onSave: async function () {
            const oMainModel = this.getOwnerComponent().getModel();
            const sMyToken = oMainModel.getProperty("/myToken");
            const oOrderStatus = oMainModel.getProperty("/OrderStatus");
            const oPayload = {
                create: this._aCreate,
                update: this._aUpdate,
                delete: this._aDelete,
                filterOrderStatus: oOrderStatus
            };
            const orderId = this.getView().getBindingContext().getObject().id;
            const url = oMainModel.getProperty("/api")+"orderItemBatch/"+orderId;
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
                this.getOwnerComponent().getModel().setProperty("/Orders", data.orderList);
            })
            .catch(error => {
                console.error('Error updating backend:', error);
            });
            // await this._callBatchApi(oPayload);             
            // this._loadItems();
        },
        onCancel: function() {
            var oMainModel = this.getOwnerComponent().getModel();
            let oOriginalEditingItem = oMainModel.getProperty("/OriginalEditingItem");
            // this._aCreate = [];
            // this._aUpdate = [];
            // this._aDelete = [];
            this.getView().getModel().setProperty("/isEditMode", false);            
            oMainModel.setProperty(this.getView().getBindingContext().getPath(),structuredClone(oOriginalEditingItem));
        }
    });
});