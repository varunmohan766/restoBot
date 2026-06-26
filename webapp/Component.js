sap.ui.define([
    "sap/ui/core/UIComponent",
    "com/bot/resto/restaurantbot/model/models"
], (UIComponent, models) => {
    "use strict";

    return UIComponent.extend("com.bot.resto.restaurantbot.Component", {
        metadata: {
            manifest: "json",
            interfaces: [
                "sap.ui.core.IAsyncContentCreation"
            ]
        },

        init() {
            // call the base component's init function
            UIComponent.prototype.init.apply(this, arguments);

            // set the device model
            this.setModel(models.createDeviceModel(), "device");

            
            var oData = new sap.ui.model.json.JSONModel();
            // oData.loadData("model/data.json");
            oData.loadData(sap.ui.require.toUrl("com/bot/resto/restaurantbot/model/data.json"));

            this.setModel(oData);

            
// ✅ Layout model (REQUIRED for FCL)
var oLayoutModel = new sap.ui.model.json.JSONModel({
    layout: "OneColumn"
});
this.setModel(oLayoutModel, "layout");



            // enable routing
            this.getRouter().initialize();
        }
    });
});