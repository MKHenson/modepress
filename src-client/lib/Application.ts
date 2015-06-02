﻿/**
* The admin code for the website
*/
module clientAdmin
{
    'use strict';
    
    angular.module('admin', ["ui.router", "ngAnimate", "ngSanitize"])
        .constant("usersURL", "http://localhost:8000/api/users")
        .constant("apiURL", "./api")
        .filter("htmlToPlaintext", function()
        {
            return function (text)
            {
                return String(text).replace(/<[^>]+>/gm, '');
            }
        })
        .constant("capthaPublicKey", "6LdiW-USAAAAAGxGfZnQEPP2gDW2NLZ3kSMu3EtT")
        .controller("loginCtrl", LoginCtrl)
        .controller("registerCtrl", RegisterCtrl)
        .controller("usersCtrl", UsersCtrl)
        .controller("postsCtrl", PostsCtrl )
        .service("Authenticator", Authenticator)
        .config(Config)
        .run(["$rootScope", "$location", "$state", "Authenticator", function ($rootScope, $location, $state: ng.ui.IStateService, auth: Authenticator)
        {
            // Redirect to login if route requires auth and you're not logged in
            $rootScope.$on('$stateChangeStart', function (event, toState, toParams )
            {
                if (!toState.forceTransition && toState.authenticate !== undefined) {
                    event.preventDefault();

                    auth.authenticated().then(function (val)
                    {
                        if (toState.authenticate && !val) {
                            $rootScope.returnToState = toState.url;
                            $rootScope.returnToStateParams = toParams.Id;
                            //$location.path('/login');
                            toState.forceTransition = false;
                            $state.go("login");
                        }
                        else if (!toState.authenticate && val) {
                            $rootScope.returnToState = toState.url;
                            $rootScope.returnToStateParams = toParams.Id;
                            //$location.path('/login');
                            toState.forceTransition = false;
                            $state.go("default");
                        }
                        else {
                            toState.forceTransition = true;
                            $state.go(toState.name);
                        }
                    });
                }
            });
        }]);
}