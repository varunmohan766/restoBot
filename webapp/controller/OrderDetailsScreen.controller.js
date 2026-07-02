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
            debugger;
            const oModel = this.getView().getModel();
            // const aOrders = oModel.getProperty("/Orders");
            const sPath = this.getView().getBindingContext().getPath();
            oModel.setProperty(sPath+'/status',"Accepted");//only for UI update, not for backend
//need an API call to update the backend with the new status
            // this.updateBackendStatus(sPath, "Accepted");
        },
        onReject: function () {
            const oModel = this.getView().getModel();
            // const aOrders = oModel.getProperty("/Orders");
            const sPath = this.getView().getBindingContext().getPath();
            oModel.setProperty(sPath+'/status',"Rejected");//only for UI update, not for backend
//need an API call to update the backend with the new status
            // this.updateBackendStatus(sPath, "Rejected");
        },
        onComplete: function () {
            const oModel = this.getView().getModel();
            const sPath = this.getView().getBindingContext().getPath();
            oModel.setProperty(sPath+'/status',"Completed");//only for UI update, not for backend
//need an API call to update the backend with the new status
            // this.updateBackendStatus(sPath, "Completed");
        },
        updateBackendStatus: function (sPath, sStatus) {
            // Implement the API call to update the backend with the new status
            // Example using fetch:
            const oModel = this.getView().getModel();
            const orderId = oModel.getProperty(sPath + '/id');
            fetch(`/api/orders/${orderId}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ status: sStatus })
            })
            .then(response => {
                if (!response.ok) {
                    throw new Error('Network response was not ok');
                }
                return response.json();
            })
            .then(data => {
                console.log('Backend updated successfully:', data);
            })
            .catch(error => {
                console.error('Error updating backend:', error);
            });
        },
        onEdit: function () {
            this.getView().getModel().setProperty("/isEditMode", true);
        },

    });
});