import PubsubAspect, { PubsubUI, BitBaseEvent } from '@teambit/pubsub';
import PreviewAspect, { ClickInsideAnIframeEvent } from '@teambit/preview';
import { Slot } from '@teambit/harmony';
import { NavigationSlot, NavLinkProps, RouteSlot } from '@teambit/react-router';
import { UIRuntime } from '@teambit/ui';
import React from 'react';
import { RouteProps } from 'react-router-dom';
import CommandBarAspect, { CommandBarUI } from '@teambit/command-bar';
import copy from 'copy-to-clipboard';
import { ComponentAspect } from './component.aspect';
import { Component } from './ui/component';
import { Menu, NavPlugin, OrderedNavigationSlot } from './ui/menu';
import { AspectSection } from './aspect.section';
import { ComponentModel } from './ui';

export type Server = {
  env: string;
  url: string;
};

export type ComponentMeta = {
  id: string;
};

export type MenuItem = {
  label: JSX.Element | string | null;
};

export const componentIdUrlRegex = '[\\w\\/-]*[\\w-]';

export class ComponentUI {
  readonly routePath = `/:componentId(${componentIdUrlRegex})`;

  constructor(
    /**
     * Pubsub aspects
     */
    private pubsub: PubsubUI,

    private routeSlot: RouteSlot,

    private navSlot: OrderedNavigationSlot,

    /**
     * slot for registering a new widget to the menu.
     */
    private widgetSlot: OrderedNavigationSlot,

    private commandBarUI: CommandBarUI
  ) {
    this.registerPubSub();
  }

  private activeComponent?: ComponentModel;

  registerPubSub() {
    this.pubsub.sub(PreviewAspect.id, (be: BitBaseEvent<any>) => {
      if (be.type === ClickInsideAnIframeEvent.TYPE) {
        const event = new MouseEvent('mousedown', {
          view: window,
          bubbles: true,
          cancelable: true,
        });

        const body = document.body;
        body?.dispatchEvent(event);
      }
    });
  }

  handleComponentChange = (activeComponent?: ComponentModel) => {
    this.activeComponent = activeComponent;
  };

  getComponentUI(host: string) {
    return <Component routeSlot={this.routeSlot} onComponentChange={this.handleComponentChange} host={host} />;
  }

  getMenu(host: string) {
    return <Menu navigationSlot={this.navSlot} widgetSlot={this.widgetSlot} host={host} />;
  }
  // getTopBarUI() {
  //   return (
  //     <TopBar
  //       // className={styles.topbar}
  //       navigationSlot={this.navSlot}
  //       version={'new'} // TODO - get component data here
  //       widgetSlot={this.widgetSlot}
  //     />
  //   );
  // }

  registerRoute(route: RouteProps) {
    this.routeSlot.register(route);
    return this;
  }

  registerNavigation(nav: NavLinkProps, order?: number) {
    this.navSlot.register({
      props: nav,
      order,
    });
  }

  registerWidget(widget: NavLinkProps, order?: number) {
    this.widgetSlot.register({ props: widget, order });
  }

  static dependencies = [PubsubAspect, CommandBarAspect];

  static runtime = UIRuntime;

  static slots = [Slot.withType<RouteProps>(), Slot.withType<NavPlugin>(), Slot.withType<NavigationSlot>()];

  static async provider(
    [pubsub, commandBarUI]: [PubsubUI, CommandBarUI],
    config,
    [routeSlot, navSlot, widgetSlot]: [RouteSlot, OrderedNavigationSlot, OrderedNavigationSlot]
  ) {
    // TODO: refactor ComponentHost to a separate extension (including sidebar, host, graphql, etc.)
    // TODO: add contextual hook for ComponentHost @uri/@oded
    const componentUI = new ComponentUI(pubsub, routeSlot, navSlot, widgetSlot, commandBarUI);
    const section = new AspectSection();

    componentUI.commandBarUI.addCommand(
      {
        id: 'copyId', // extract to constant!
        handler: () => {
          console.log('blaa', componentUI.activeComponent?.id.toString());
          copy(componentUI.activeComponent?.id.toString() || '');
        },
        displayName: 'copy bit id',
        keybinding: '.',
      },
      {
        id: 'copyNpmId', // extract to constant!
        handler: () => {
          const packageName = componentUI.activeComponent?.packageName;
          if (packageName) {
            const version = componentUI.activeComponent?.id.version;
            const versionString = version ? `@${version}` : '';
            copy(`${packageName}${versionString}`);
          }
        },
        displayName: 'copy npm id',
        keybinding: ',',
      }
    );

    componentUI.registerRoute(section.route);
    componentUI.registerWidget(section.navigationLink, section.order);
    return componentUI;
  }
}

export default ComponentUI;

ComponentAspect.addRuntime(ComponentUI);
