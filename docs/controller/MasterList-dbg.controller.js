sap.ui.define([
    "sap/ui/core/mvc/Controller",
    "sap/ui/model/Filter",
    "sap/ui/model/FilterOperator"
], function (Controller, Filter, FilterOperator) {
    "use strict";

    return Controller.extend("com.bot.resto.restaurantbot.controller.MasterList", {

        /*onInit: async function () {
            // this.getOwnerComponent()
            //     .getRouter()
            //     .getRoute("master")
            //     .attachPatternMatched(this._onMatched, this);
            
            const statuses = {
                New : true,
                Accepted : true,
                Completed : false,
                Rejected : false
            };
            this.getOwnerComponent().getModel().setProperty("/OrderStatus", statuses);
            
            // this.getView().getModel()

            // this._getLoginToken();

            try {
                // First: get login token
                // await this._getLoginToken();

                // Then: call orders with filters (empty object for now)
                await this._getOrders(statuses);
            } catch (err) {
                console.error("Initialization failed:", err);
                sap.m.MessageToast.show("Error initializing app: " + err.message);
            }
        },
        _getLoginToken: async function () {
            try {
                const api = this.getOwnerComponent().getModel().getProperty("/api");
                const res = await fetch(api + "login", {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json"
                    },
                    body: JSON.stringify({
                        username: "admin",
                        password: "admin123"
                    })
                });
                if (!res.ok) {
                    // Non-200 status codes
                    throw new Error(`Login failed: ${res.status} ${res.statusText}`);
                }

                const data = await res.json();
                // this.myToken = data.token;
                this.getOwnerComponent().getModel().setProperty("/myToken", data.token);

            } catch (err) {
                console.error("Error in _getLoginToken:", err);
                sap.m.MessageToast.show("Login failed: " + err.message);
                // Optionally rethrow if you want onInit to handle it
                throw err;

            }
        },*/
        onInit: function () {
            const sMyToken = this.getOwnerComponent().getModel().getProperty("/myToken");
            if (!sMyToken) {
                this.getOwnerComponent().getRouter().navTo("login");
            }
            this.getOwnerComponent().getRouter().getRoute("master").attachPatternMatched(this._onMatched, this);
        },

        _onMatched: function () {
            const statuses = {
                New: true,
                Accepted: true,
                Completed: false,
                Rejected: false
            };
            this.getOwnerComponent().getModel().setProperty("/OrderStatus", statuses);
            this._getOrders(statuses)
        },

        onStatusFilter: function () {
            this._getOrders(this.getOwnerComponent().getModel().getProperty("/OrderStatus"));
            //  const selectedStatuses = Object.keys(statuses).filter(key => statuses[key]);             
        },

        onSelectionChange: function (oEvent) {
            const oItem = oEvent.getParameter("listItem") || oEvent.getSource();
            const sId = oItem.getBindingContext().getProperty("id");
            const sindex = oItem.getBindingContext().getPath().split("/")[2];

            this.getOwnerComponent().getRouter().navTo("detail", { id: sindex });

            this.getOwnerComponent().getModel("layout").setProperty("/layout", "TwoColumnsMidExpanded");
        },

        _getOrders: function (statuses) {
            var oMainModel = this.getOwnerComponent().getModel();
            const sMyToken = oMainModel.getProperty("/myToken");
            const queryParams = new URLSearchParams();
            // Object.entries(oFilters).forEach(([key, value]) => {
            //     if (value) {
            //     queryParams.append(key, value);
            //     }
            // });
            // Pick only the statuses that are true
            Object.entries(statuses).forEach(([key, value]) => {
                if (value === true) {
                    queryParams.append("status", key);
                }
            });
            const url = oMainModel.getProperty("/api") + "orderDetails";
            const fullUrl = queryParams.toString() ? `${url}?${queryParams.toString()}` : url;
            fetch(fullUrl, {
                method: "GET",
                headers: {
                    "Authorization": "Bearer " + sMyToken
                }
            })
                .then(response => response.json())
                .then(data => {
                    oMainModel.setProperty("/Orders", structuredClone(data.orderList));

                    // var oModel = new sap.ui.model.json.JSONModel(data);
                    // sap.ui.getCore().setModel(oModel, "apiModel");
                })
                .catch(err => {
                    console.error(err);
                });
        },

        onStockPress: function () {
            this.getOwnerComponent().getRouter().navTo("stock");
        },

        onSearch: function(){
            
        }
    });
});