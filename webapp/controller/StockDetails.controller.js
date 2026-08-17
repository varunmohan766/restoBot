sap.ui.define([
  "sap/ui/core/mvc/Controller",
  "sap/ui/model/json/JSONModel",
  "sap/m/MessageToast",
  "sap/m/MessageBox"
], function (Controller, JSONModel, MessageToast, MessageBox) {
  "use strict";

  return Controller.extend("com.bot.resto.restaurantbot.controller.StockDetails", {    

    onInit: function () {
      const sMyToken = this.getOwnerComponent().getModel().getProperty("/myToken");
      if (!sMyToken) {
        this.getOwnerComponent().getRouter().navTo("login");
      }
      this.getOwnerComponent().getRouter().getRoute("stock").attachPatternMatched(this._onMatched, this);
    },

    _onMatched: function () {
      this._initModel();
      this._loadData();
    },
    
    _initModel: function () {
      var oModel = new JSONModel({
        items: [],
        isEdit: false
      });
      this.getView().setModel(oModel, "stockModel");
    },

    _loadData: function () {
      const oMainModel = this.getOwnerComponent().getModel();
      const sMyToken = oMainModel.getProperty("/myToken");
      const url = oMainModel.getProperty("/api") + "stockList";

      fetch(url, {
        method: "GET",
        headers: {
          "Authorization": "Bearer " + sMyToken
        }
      })
        .then(res => res.json())
        .then(data => {
          this.getView().getModel("stockModel").setProperty("/items", data.stockList);
        })
        .catch(() => {
          MessageToast.show("Failed to load data");
        });
    },

    onEditToggle: function () {
      var oModel = this.getView().getModel("stockModel");
      oModel.setProperty("/isEdit", true);
      MessageToast.show("Edit mode enabled");
      let oOriginalEditingItem = oModel.getProperty("/items");

      oModel.setProperty("/OriginalEditingItem", structuredClone(oOriginalEditingItem));
      this._aCreate = [];
      this._aDelete = [];
      this._aUpdate = [];
    },

    onAddItem: function () {
      var oModel = this.getView().getModel("stockModel");
      var aItems = oModel.getProperty("/items");

      const oNewItem = {
        Name: "",
        Description: "",
        Quantity: 0,
        Price: 0,
        Status: "",
        category: "",
        veg_nonveg: "",
        _idNew: this._aCreate[this._aCreate.length - 1]?._idNew + 1 || 0
      };
      aItems.push(oNewItem);
      this._aCreate.push(oNewItem);
      oModel.refresh(true);
    },

    onFieldChange: function (oEvent) {
      const oContext = oEvent.getSource().getBindingContext("stockModel");
      const oRow = oContext.getObject();
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

    onDeleteItem: function (oEvent) {
      const oModel = this.getView().getModel("stockModel");
      const oContext = oEvent.getSource().getBindingContext("stockModel");
      const oRow = oContext.getObject();
      const sPath = oContext.getPath();
      const iIndex = Number(sPath.split("/")[2]);
      const aItems = oModel.getProperty("/items");

      if (Object.hasOwn(oRow, '_idNew')) {
        this._aCreate = this._aCreate.filter(item => item._idNew !== oRow._idNew);
      } else {
        const bExists = this._aDelete.some(item => item.id === oRow.id);

        if (!bExists) {
          this._aDelete.push({
            id: oRow.id
          });
        }
        this._aUpdate = this._aUpdate.filter(item => item.id !== oRow.id);
      }

      aItems.splice(iIndex, 1);
      oModel.refresh(true);
    },

    onSave: function () {
      var oModel = this.getView().getModel("stockModel");

      const oPayload = {
        create: this._aCreate,
        update: this._aUpdate,
        delete: this._aDelete
      };
      const oMainModel = this.getOwnerComponent().getModel();
      const sMyToken = oMainModel.getProperty("/myToken");

      MessageBox.confirm("Do you want to save changes?", {
        onClose: (sAction) => {
          if (sAction === "OK") {
            const url = oMainModel.getProperty("/api") + "stockBatch";

            fetch(url, {
              method: "PUT",
              headers: {
                "Content-Type": "application/json",
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
                MessageToast.show("Saved successfully");

                oModel.setProperty("/isEdit", false);
                oModel.setProperty("/items", data.stockList);
              })
              .catch(() => {
                MessageToast.show("Save failed");
              });

          }
        }
      });
    },

    onCancel: function () {
      var oModel = this.getView().getModel("stockModel");
      let oOriginalEditingItem = oModel.getProperty("/OriginalEditingItem");
      // this._aCreate = [];
      // this._aUpdate = [];
      // this._aDelete = [];
      oModel.setProperty("/isEdit", false);
      oModel.setProperty("/items", structuredClone(oOriginalEditingItem));
    },

    onNavBack: function () {
      this.getOwnerComponent().getRouter().navTo("master");
    }
  });
});