sap.ui.define([
    "sap/ui/core/mvc/Controller"
], function (Controller) {
    "use strict";

    return Controller.extend("com.bot.resto.restaurantbot.controller.OrderDetailsScreen", {

        onInit: function () {
            this.getOwnerComponent()
                .getRouter()
                .getRoute("detail")
                .attachPatternMatched(this._onMatched, this);
        },

        _onMatched: function (oEvent) {

            const sId = oEvent.getParameter("arguments").id;
            this.getView().bindElement("/Orders/"+sId);

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
        }

    });
});