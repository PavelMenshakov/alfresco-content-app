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
import { RouteExtension } from './route.extension';
import { ActionExtension } from './action.extension';
import { AppConfigService } from '@alfresco/adf-core';
import { ContentActionExtension } from './content-action.extension';

@Injectable()
export class ExtensionService {
    routes: Array<RouteExtension> = [];
    actions: Array<ActionExtension> = [];
    contentActions: Array<ContentActionExtension> = [];

    authGuards: { [key: string]: Type<{}> } = {};
    components: { [key: string]: Type<{}> } = {};

    constructor(private config: AppConfigService) {}

    init() {
        this.routes = this.config.get<Array<RouteExtension>>(
            'extensions.core.routes'
        );

        this.actions = this.config.get<Array<ActionExtension>>(
            'extensions.core.actions'
        );

        this.contentActions = this.config.get<Array<ContentActionExtension>>(
            'extensions.core.features.content.actions'
        );

        this.debugLog();
    }

    getRouteById(id: string): RouteExtension {
        return this.routes.find(route => route.id === id);
    }

    getActionById(id: string): ActionExtension {
        return this.actions.find(action => action.id === id);
    }

    private debugLog() {
        console.log(this.routes);
        console.log(this.actions);
        console.log(this.components);
        console.log(this.authGuards);
        console.log(this.contentActions);
    }
}