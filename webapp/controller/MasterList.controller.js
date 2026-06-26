sap.ui.define([
    "sap/ui/core/mvc/Controller",
    "sap/ui/model/Filter",
    "sap/ui/model/FilterOperator"
], function (Controller, Filter, FilterOperator) {
    "use strict";

    return Controller.extend("com.bot.resto.restaurantbot.controller.MasterList", {

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
        }

    });
});