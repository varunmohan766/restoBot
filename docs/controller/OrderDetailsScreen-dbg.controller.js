sap.ui.define([
    "sap/ui/core/mvc/Controller",
    "sap/m/MessageToast"
], function (Controller, MessageToast) {
    "use strict";

    return Controller.extend("com.bot.resto.restaurantbot.controller.OrderDetailsScreen", {

        onInit: function () {
        },

        // Refresh Data
        onRefresh: function () {
            this.getView().getModel().refresh();
        },

        // ✅ Accept Order
        onAccept: function (oEvent) {

            const oContext = oEvent.getSource().getBindingContext();
            const orderId = oContext.getProperty("ID");

            this._callAction("acceptOrder", orderId, "Order Accepted");


            // const oContext = oEvent.getSource().getBindingContext();
            //     this._callAction("acceptOrder", oContext, "Order Accepted");

            // const oContext = oEvent.getSource().getBindingContext();
            // const orderId = oContext.getProperty("ID");

            // this._callAction("acceptOrder", orderId, "Order Accepted");
        },

        // ❌ Reject Order
        onReject: function (oEvent) {
            const oContext = oEvent.getSource().getBindingContext();
            const orderId = oContext.getProperty("ID");

            this._callAction("rejectOrder", orderId, "Order Rejected");
        },

        // ✅ Complete Order
        onComplete: function (oEvent) {
            const oContext = oEvent.getSource().getBindingContext();
            const orderId = oContext.getProperty("ID");

            this._callAction("completeOrder", orderId, "Order Completed");
        },

        // ✅ Reusable action call

        _callAction: function (sAction, orderId, message) {

            const oModel = this.getOwnerComponent().getModel();

            const oAction = oModel.bindContext("/" + sAction + "(...)");

            oAction.setParameter("orderId", orderId);

            oAction.execute().then(() => {
                sap.m.MessageToast.show(message);
                oModel.refresh();
            }).catch((err) => {
                console.error(err);
                sap.m.MessageToast.show("Error occurred");
            });

        }


    });
});