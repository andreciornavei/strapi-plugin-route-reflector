'use strict';

const _ = require("lodash")

module.exports = async () => {

  // *************************************************************************************************** //
  // This script has the purpose to make uncomplicated the roles/permissions panel management            //
  // 1 - Allow all application routes by default to authenticated users.                                 //
  // 2 - Remove all existent route permission if it's not used on routes.josn but present in database.   //
  // 3 - Create a new route permission if it's present on routes.json but not on database.               //
  // *************************************************************************************************** //


  // clean every permission who doesn't have role (it prevents bootstrap errors)
  await strapi.query('permission', 'users-permissions').delete({ role: null });

  // variable to hold all configurated permissions
  let configuredHandlers = [];
  const authenticated = await strapi.query('role', 'users-permissions').findOne({ type: 'authenticated' });
  if (authenticated) {
    authenticated.permissions.forEach(permission => {
      // Change only permissions of application (not plugins)
      if (permission.type === 'application') {
        if (Object.keys(strapi.api).includes(permission.controller)) {
          // if contenttype exists, check for routes
          const handler = `${permission.controller}.${permission.action}`
          const routesHandlers = strapi.api[permission.controller].config.routes.map(route => {
            return route.handler.toLowerCase()
          });
          if (routesHandlers.includes(handler)) {
            // if project has prmission handler configured, so turn permission to true
            let newPermission = permission;
            newPermission.enabled = true;
            strapi.query('permission', 'users-permissions').update({ id: newPermission.id }, newPermission);
          } else {
            // if project controller doesnt have the action configured, so remove permission from database
            strapi.query('permission', 'users-permissions').delete({ id: permission.id });
          }
          configuredHandlers.push(handler)
        } else {
          //if permission controller does not exists on project, remove permission from database
          strapi.query('permission', 'users-permissions').delete({ id: permission.id });
        }
      }
    });

    // if database permission does not exists on project configuration, create it on database
    Object.keys(strapi.api).forEach(contenttype => {
      if (strapi.api[contenttype].config && strapi.api[contenttype].config.routes) {
        strapi.api[contenttype].config.routes.forEach(route => {
          const parseRoute = route.handler.toLowerCase()
          const [controller, action] = parseRoute.split(".");
          if (!configuredHandlers.includes(parseRoute)) {
            strapi.query('permission', 'users-permissions').create({
              type: 'application',
              controller: controller,
              action: action,
              enabled: true,
              policy: '',
              __v: 0,
              role: authenticated.id,
            });
          }
        })
      }
    });
  }

};
