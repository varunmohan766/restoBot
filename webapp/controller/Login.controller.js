sap.ui.define([
    "sap/ui/core/mvc/Controller",
    "sap/m/MessageToast"
], function (Controller, MessageToast) {
    "use strict";

    return Controller.extend("com.bot.resto.restaurantbot.controller.Login", {

        onClickLogin: async function () {
            try {
                const oMainModel = this.getOwnerComponent().getModel();
                const api = oMainModel.getProperty("/api");
                const res = await fetch(api + "login", {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json"
                    },
                    body: JSON.stringify({
                        username: oMainModel.getProperty("/username"),
                        password: oMainModel.getProperty("/password")
                    })
                });
                oMainModel.setProperty("/password", "");
                if (!res.ok) {
                    // Non-200 status codes
                    throw new Error(`Login failed: ${res.status} ${res.statusText}`);
                }

                const data = await res.json();
                // this.myToken = data.token;
                oMainModel.setProperty("/myToken", data.token);
                if (data.token) {
                    this.getOwnerComponent().getRouter().navTo("master");
                }
            } catch (err) {
                console.error("Error in _getLoginToken:", err);
                sap.m.MessageToast.show("Login failed: " + err.message);
                // Optionally rethrow if you want onInit to handle it
                throw err;
            }
        }
    }
    );
});