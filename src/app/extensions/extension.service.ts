/*!
 * @license
 * Alfresco Example Content Application
 *
 * Copyright (C) 2005 - 2018 Alfresco Software Limited
 *
 * This file is part of the Alfresco Example Content Application.
 * If the software was purchased under a paid Alfresco license, the terms of
 * the paid license agreement will prevail.  Otherwise, the software is
 * provided under the following open source license terms:
 *
 * The Alfresco Example Content Application is free software: you can redistribute it and/or modify
 * it under the terms of the GNU Lesser General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * The Alfresco Example Content Application is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU Lesser General Public License for more details.
 *
 * You should have received a copy of the GNU Lesser General Public License
 * along with Alfresco. If not, see <http://www.gnu.org/licenses/>.
 */

import { Injectable, Type } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Store } from '@ngrx/store';
import {
    ContentActionExtension,
    ContentActionType
} from './content-action.extension';
import { OpenWithExtension } from './open-with.extension';
import { NavigationExtension } from './navigation.extension';
import { Route } from '@angular/router';
import { ActionRef } from './action-ref';
import { RouteRef } from './route-ref';
import { ExtensionConfig } from './extension.config';
import { AppStore, SelectionState } from '../store/states';
import { RuleRef } from './rules/rule-ref';
import { RuleEvaluator } from './rules/rule-evaluator';
import { NavigationState } from '../store/states/navigation.state';
import { RuleContext } from './rules/rule-context';
import { selectionWithFolder } from '../store/selectors/app.selectors';

@Injectable()
export class ExtensionService implements RuleContext {
    configPath = 'assets/app.extensions.json';

    actions: Array<ActionRef> = [];
    contentActions: Array<ContentActionExtension> = [];
    openWithActions: Array<OpenWithExtension> = [];
    createActions: Array<ContentActionExtension> = [];
    rules: Array<RuleRef> = [];
    routes: Array<RouteRef> = [];
    authGuards: { [key: string]: Type<{}> } = {};
    components: { [key: string]: Type<{}> } = {};
    navbar: { [key: string]: any } = {};

    evaluators: { [key: string]: RuleEvaluator } = {};
    selection: SelectionState;
    navigation: NavigationState;

    constructor(private http: HttpClient, private store: Store<AppStore>) {
        this.store.select(selectionWithFolder).subscribe(result => {
            this.selection = result.selection;
            this.navigation = result.navigation;
        });
    }

    load(): Promise<boolean> {
        return new Promise<any>(resolve => {
            this.http.get<ExtensionConfig>(this.configPath).subscribe(
                config => {
                    console.log(config);
                    this.setup(config);
                    resolve(true);
                },
                error => {
                    console.log(error);
                    resolve(false);
                }
            );
        });
    }

    setup(config: ExtensionConfig) {
        if (!config) {
            console.error('Extension configuration not found');
            return;
        }

        this.rules = this.loadRules(config);
        this.actions = this.loadActions(config);
        this.routes = this.loadRoutes(config);
        this.contentActions = this.loadContentActions(config);
        this.openWithActions = this.loadViewerOpenWith(config);
        this.createActions = this.loadCreateActions(config);
        this.navbar = this.loadNavBar(config);
    }


    protected loadCreateActions(config: ExtensionConfig): Array<ContentActionExtension> {
        if (config && config.app && config.app.features && config.app.features.create) {
            return (config.app.features.create || []).sort(
                this.sortByOrder
            );
        }
        return [];
    }

    protected loadContentActions(config: ExtensionConfig) {
        if (config && config.app && config.app.features && config.app.features.content) {
            return (config.app.features.content.actions || []).sort(
                this.sortByOrder
            );
        }
        return [];
    }

    protected loadNavBar(config: ExtensionConfig): any {
        if (config && config.app && config.app.features) {
            return config.app.features.navbar || {};
        }
        return {};
    }

    protected loadViewerOpenWith(config: ExtensionConfig): Array<OpenWithExtension> {
        if (config && config.app && config.app.features && config.app.features.viewer) {
            return (config.app.features.viewer.openWith || [])
                .filter(entry => !entry.disabled)
                .sort(this.sortByOrder);
        }
        return [];
    }

    protected loadRules(config: ExtensionConfig): Array<RuleRef> {
        if (config && config.app && config.app.rules) {
            return config.app.rules;
        }
        return [];
    }

    protected loadRoutes(config: ExtensionConfig): Array<RouteRef> {
        if (config && config.app && config.app.routes) {
            return config.app.routes;
        }
        return [];
    }

    protected loadActions(config: ExtensionConfig): Array<ActionRef> {
        if (config && config.app && config.app.actions) {
            return config.app.actions;
        }
        return [];
    }

    setEvaluator(key: string, value: RuleEvaluator): ExtensionService {
        this.evaluators[key] = value;
        return this;
    }

    setAuthGuard(key: string, value: Type<{}>): ExtensionService {
        this.authGuards[key] = value;
        return this;
    }

    getRouteById(id: string): RouteRef {
        return this.routes.find(route => route.id === id);
    }

    getAuthGuards(ids: string[]): Array<Type<{}>> {
        return (ids || [])
            .map(id => this.authGuards[id])
            .filter(guard => guard);
    }

    // todo: consider precalculating on init
    getNavigationGroups(): Array<NavigationExtension[]> {
        if (this.navbar) {
            const groups = Object.keys(this.navbar).map(key => {
                return this.navbar[key]
                    .map(group => {
                        const customRoute = this.getRouteById(group.route);
                        const route = `/${
                            customRoute ? customRoute.path : group.route
                        }`;

                        return {
                            ...group,
                            route
                        };
                    })
                    .filter(entry => !entry.disabled);
            });

            return groups;
        }

        return [];
    }

    setComponent(id: string, value: Type<{}>): ExtensionService {
        this.components[id] = value;
        return this;
    }

    getComponentById(id: string): Type<{}> {
        return this.components[id];
    }

    getApplicationRoutes(): Array<Route> {
        return this.routes.map(route => {
            const guards = this.getAuthGuards(route.auth);

            return {
                path: route.path,
                component: this.getComponentById(route.layout),
                canActivateChild: guards,
                canActivate: guards,
                children: [
                    {
                        path: '',
                        component: this.getComponentById(route.component),
                        data: route.data
                    }
                ]
            };
        });
    }

    getCreateActions(): Array<ContentActionExtension> {
        return this.createActions
            .filter(this.filterEnabled)
            .filter(action => this.filterByRules(action))
            .map(action => {
                let disabled = false;

                if (action.rules && action.rules.enabled) {
                    disabled = !this.evaluateRule(action.rules.enabled);
                }

                return {
                    ...action,
                    disabled
                };
            });
    }

    // evaluates content actions for the selection and parent folder node
    getAllowedContentActions(): Array<ContentActionExtension> {
        return this.contentActions
            .filter(this.filterEnabled)
            .filter(action => this.filterByRules(action))
            .reduce(this.reduceSeparators, [])
            .map(action => {
                if (action.type === ContentActionType.menu) {
                    const copy = this.copyAction(action);
                    if (copy.children && copy.children.length > 0) {
                        copy.children = copy.children
                            .filter(childAction =>
                                this.filterByRules(childAction)
                            )
                            .reduce(this.reduceSeparators, []);
                    }
                    return copy;
                }
                return action;
            })
            .reduce(this.reduceEmptyMenus, []);
    }

    reduceSeparators(
        acc: ContentActionExtension[],
        el: ContentActionExtension,
        i: number,
        arr: ContentActionExtension[]
    ): ContentActionExtension[] {
        // remove duplicate separators
        if (i > 0) {
            const prev = arr[i - 1];
            if (
                prev.type === ContentActionType.separator &&
                el.type === ContentActionType.separator
            ) {
                return acc;
            }

            // remove trailing separator
            if (i === arr.length - 1) {
                if (el.type === ContentActionType.separator) {
                    return acc;
                }
            }
        }

        return acc.concat(el);
    }

    reduceEmptyMenus(
        acc: ContentActionExtension[],
        el: ContentActionExtension
    ): ContentActionExtension[] {
        if (el.type === ContentActionType.menu) {
            if ((el.children || []).length === 0) {
                return acc;
            }
        }
        return acc.concat(el);
    }

    sortByOrder(
        a: { order?: number | undefined },
        b: { order?: number | undefined }
    ) {
        const left = a.order === undefined ? Number.MAX_SAFE_INTEGER : a.order;
        const right = b.order === undefined ? Number.MAX_SAFE_INTEGER : b.order;
        return left - right;
    }

    filterEnabled(entry: { disabled?: boolean }): boolean {
        return !entry.disabled;
    }

    copyAction(action: ContentActionExtension): ContentActionExtension {
        return {
            ...action,
            children: (action.children || []).map(child =>
                this.copyAction(child)
            )
        };
    }

    filterByRules(action: ContentActionExtension): boolean {
        if (action && action.rules && action.rules.visible) {
            return this.evaluateRule(action.rules.visible);
        }
        return true;
    }

    getActionById(id: string): ActionRef {
        return this.actions.find(action => action.id === id);
    }

    runActionById(id: string, context?: any) {
        const action = this.getActionById(id);
        if (action) {
            const { type, payload } = action;
            const expression = this.runExpression(payload, context);

            this.store.dispatch({ type, payload: expression });
        }
    }

    runExpression(value: string, context?: any) {
        const pattern = new RegExp(/\$\((.*\)?)\)/g);
        const matches = pattern.exec(value);

        if (matches && matches.length > 1) {
            const expression = matches[1];
            const fn = new Function('context', `return ${expression}`);
            const result = fn(context);

            return result;
        }

        return value;
    }

    evaluateRule(ruleId: string): boolean {
        const ruleRef = this.rules.find(ref => ref.id === ruleId);
        if (ruleRef) {
            const evaluator = this.evaluators[ruleRef.type];
            if (evaluator) {
                return evaluator(this, ...ruleRef.parameters);
            }
        }
        return false;
    }
}
