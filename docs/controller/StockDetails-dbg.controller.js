sap.ui.define([
  "sap/ui/core/mvc/Controller",
  "sap/ui/model/json/JSONModel",
  "sap/m/MessageToast",
  "sap/m/MessageBox"
], function (Controller, JSONModel, MessageToast, MessageBox) {
  "use strict";

  return Controller.extend("com.bot.resto.restaurantbot.controller.StockDetails", {

    onInit: function () {
      this._initModel();
      this._loadData();
    },

    // ✅ INIT MODEL
    _initModel: function () {
      var oModel = new JSONModel({
        items: [],
        isEdit: false,
        deletedItems: []   // track deleted items
      });

      this.getView().setModel(oModel, "stockModel");
    },

    // ✅ LOAD DATA FROM API
    _loadData: function () {
    //   fetch(sap.ui.require.toUrl("com/bot/resto/restaurantbot/model/mockStock.json"))
      fetch("/model/mockStock.json")
        .then(res => res.json())
        .then(data => {
          this.getView().getModel("stockModel").setProperty("/items", data.items);
        })
        .catch(() => {
          MessageToast.show("Failed to load data");
        });
    },

    // ✅ TOGGLE EDIT MODE
    onEditToggle: function () {
      var oModel = this.getView().getModel("stockModel");
      var bEdit = oModel.getProperty("/isEdit");

      oModel.setProperty("/isEdit", !bEdit);

      if (!bEdit) {
        MessageToast.show("Edit mode enabled");
      } else {
        MessageToast.show("Edit mode disabled");
      }
    },

    // ✅ ADD NEW ROW
    onAddItem: function () {
      var oModel = this.getView().getModel("stockModel");
      var aItems = oModel.getProperty("/items");

      aItems.push({
        ItemId: "",
        Name: "",
        Description: "",
        Quantity: 0,
        Price: 0,
        isNew: true
      });

      oModel.setProperty("/items", aItems);
    },

    // ✅ DELETE ITEM (UI + TRACK FOR API)
    onDeleteItem: function (oEvent) {
      var oModel = this.getView().getModel("stockModel");
      var oContext = oEvent.getSource().getBindingContext("stockModel");

      var sPath = oContext.getPath();  // /items/2
      var iIndex = parseInt(sPath.split("/")[2]);

      var aItems = oModel.getProperty("/items");
      var aDeleted = oModel.getProperty("/deletedItems");

      var oDeletedItem = aItems[iIndex];

      // If already existing item, mark for delete
      if (!oDeletedItem.isNew) {
        aDeleted.push(oDeletedItem);
      }

      // Remove from UI
      aItems.splice(iIndex, 1);

      oModel.setProperty("/items", aItems);
      oModel.setProperty("/deletedItems", aDeleted);
    },

    // ✅ SAVE (CREATE + UPDATE + DELETE)
    onSave: function () {
      var oModel = this.getView().getModel("stockModel");

      var payload = {
        items: oModel.getProperty("/items"),
        deletedItems: oModel.getProperty("/deletedItems")
      };

      MessageBox.confirm("Do you want to save changes?", {
        onClose: (sAction) => {
          if (sAction === "OK") {

            fetch("/api/stock/save", {
              method: "POST",
              headers: {
                "Content-Type": "application/json"
              },
              body: JSON.stringify(payload)
            })
              .then(() => {
                MessageToast.show("Saved successfully");

                oModel.setProperty("/isEdit", false);
                oModel.setProperty("/deletedItems", []);

                this._loadData();
              })
              .catch(() => {
                MessageToast.show("Save failed");
              });

          }
        }
      });
    },
    onNavBack: function () {
      this.getOwnerComponent().getRouter().navTo("master");
    }

  });
});