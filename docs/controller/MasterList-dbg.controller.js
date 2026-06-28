sap.ui.define([
    "sap/ui/core/mvc/Controller",
    "sap/ui/model/Filter",
    "sap/ui/model/FilterOperator"
], function (Controller, Filter, FilterOperator) {
    "use strict";

    return Controller.extend("com.bot.resto.restaurantbot.controller.MasterList", {

        onInit: function () {
            // this.getOwnerComponent()
            //     .getRouter()
            //     .getRoute("master")
            //     .attachPatternMatched(this._onMatched, this);

            this._getLoginToken();
        },

        onSelectionChange: function (oEvent) {
            const oItem = oEvent.getParameter("listItem") || oEvent.getSource();
            const sId = oItem.getBindingContext().getProperty("id");
            const sindex = oItem.getBindingContext().getPath().split("/")[2];

            this.getOwnerComponent().getRouter().navTo("detail", { id: sindex });

            this.getOwnerComponent()
                .getModel("layout")
                .setProperty("/layout", "TwoColumnsMidExpanded");
        },

        onSearch: function (oEvent) {
            const sQuery = oEvent.getParameter("query");
            const oList = this.byId("list");
            const oBinding = oList.getBinding("items");

            if (sQuery) {
                oBinding.filter([
                    new Filter("customerName", FilterOperator.Contains, sQuery)
                ]);
            } else {
                oBinding.filter([]);
            }
        },
        _getLoginToken: function () {
            fetch("http://localhost:3000/login", {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json"
                    },
                    body: JSON.stringify({
                        username: "admin",
                        password: "admin123"
                    })
                })
                .then(response => response.json())
                .then(data => {
                    this.myToken = data.token;
                    this._getOrders();
                })
                .catch(err => console.error(err));
        },
        _getOrders: function () {
            fetch("http://localhost:3000/orders", {
                    method: "GET",
                    headers: {
                        "Authorization": "Bearer " + this.myToken
                    }
                })
                .then(response => response.json())
                .then(data => {
                    var oModel = new sap.ui.model.json.JSONModel(data);
                    sap.ui.getCore().setModel(oModel, "apiModel");
                })
                .catch(err => console.error(err));
        }

    });
});