declare module '@base-ui/react/merge-props' {
  export function mergeProps<T = any>(...args: any[]): any;
}

declare module '@base-ui/react/use-render' {
  export function useRender(config: any): any;
  export namespace useRender {
    type ComponentProps<T = any> = any;
  }
}

declare module '@base-ui/react/alert-dialog' {
  export const AlertDialog: any;
  export namespace AlertDialog {
    type Props = any;
    namespace Root { type Props = any; }
    namespace Trigger { type Props = any; }
    namespace Portal { type Props = any; }
    namespace Backdrop { type Props = any; }
    namespace Popup { type Props = any; }
    namespace Title { type Props = any; }
    namespace Description { type Props = any; }
    namespace Close { type Props = any; }
  }
}

declare module '@base-ui/react/avatar' {
  export const Avatar: any;
  export namespace Avatar {
    type Props = any;
    namespace Root { type Props = any; }
    namespace Image { type Props = any; }
    namespace Fallback { type Props = any; }
  }
}

declare module '@base-ui/react/button' {
  export const Button: any;
  export namespace Button {
    type Props = any;
  }
}

declare module '@base-ui/react/checkbox' {
  export const Checkbox: any;
  export namespace Checkbox {
    type Props = any;
    namespace Root { type Props = any; }
    namespace Indicator { type Props = any; }
  }
}

declare module '@base-ui/react/dialog' {
  export const Dialog: any;
  export namespace Dialog {
    type Props = any;
    namespace Root { type Props = any; }
    namespace Trigger { type Props = any; }
    namespace Portal { type Props = any; }
    namespace Backdrop { type Props = any; }
    namespace Popup { type Props = any; }
    namespace Title { type Props = any; }
    namespace Description { type Props = any; }
    namespace Close { type Props = any; }
  }
}

declare module '@base-ui/react/drawer' {
  export const Drawer: any;
  export namespace Drawer {
    type Props = any;
    namespace Root { type Props = any; }
    namespace Trigger { type Props = any; }
    namespace Portal { type Props = any; }
    namespace Backdrop { type Props = any; }
    namespace Popup { type Props = any; }
    namespace Title { type Props = any; }
    namespace Description { type Props = any; }
    namespace Close { type Props = any; }
  }
}

declare module '@base-ui/react/menu' {
  export const Menu: any;
  export namespace Menu {
    type Props = any;
    namespace Root { type Props = any; }
    namespace Trigger { type Props = any; }
    namespace Portal { type Props = any; }
    namespace Backdrop { type Props = any; }
    namespace Positioner { type Props = any; }
    namespace Popup { type Props = any; }
    namespace Item { type Props = any; }
    namespace Group { type Props = any; }
    namespace GroupLabel { type Props = any; }
    namespace Separator { type Props = any; }
    namespace CheckboxItem { type Props = any; }
    namespace RadioGroup { type Props = any; }
    namespace RadioItem { type Props = any; }
    namespace SubmenuRoot { type Props = any; }
    namespace SubmenuTrigger { type Props = any; }
  }
}

declare module '@base-ui/react/input' {
  export const Input: any;
  export namespace Input {
    type Props = any;
  }
}

declare module '@base-ui/react/popover' {
  export const Popover: any;
  export namespace Popover {
    type Props = any;
    namespace Root { type Props = any; }
    namespace Trigger { type Props = any; }
    namespace Portal { type Props = any; }
    namespace Backdrop { type Props = any; }
    namespace Positioner { type Props = any; }
    namespace Popup { type Props = any; }
    namespace Title { type Props = any; }
    namespace Description { type Props = any; }
    namespace Close { type Props = any; }
    namespace Arrow { type Props = any; }
  }
}

declare module '@base-ui/react/progress' {
  export const Progress: any;
  export namespace Progress {
    type Props = any;
    namespace Root { type Props = any; }
    namespace Track { type Props = any; }
    namespace Indicator { type Props = any; }
    namespace Value { type Props = any; }
    namespace Label { type Props = any; }
  }
}

declare module '@base-ui/react/scroll-area' {
  export const ScrollArea: any;
  export namespace ScrollArea {
    type Props = any;
    namespace Root { type Props = any; }
    namespace Viewport { type Props = any; }
    namespace Scrollbar { type Props = any; }
    namespace Thumb { type Props = any; }
    namespace Corner { type Props = any; }
  }
}

declare module '@base-ui/react/select' {
  export const Select: any;
  export namespace Select {
    type Props = any;
    namespace Root { type Props = any; }
    namespace Trigger { type Props = any; }
    namespace Value { type Props = any; }
    namespace Label { type Props = any; }
    namespace Icon { type Props = any; }
    namespace Portal { type Props = any; }
    namespace Backdrop { type Props = any; }
    namespace Positioner { type Props = any; }
    namespace Popup { type Props = any; }
    namespace List { type Props = any; }
    namespace Item { type Props = any; }
    namespace ItemText { type Props = any; }
    namespace ItemIndicator { type Props = any; }
    namespace Group { type Props = any; }
    namespace GroupLabel { type Props = any; }
    namespace Separator { type Props = any; }
    namespace ScrollUpArrow { type Props = any; }
    namespace ScrollDownArrow { type Props = any; }
  }
}

declare module '@base-ui/react/separator' {
  export const Separator: any;
  export namespace Separator {
    type Props = any;
    namespace Root { type Props = any; }
  }
}

declare module '@base-ui/react/switch' {
  export const Switch: any;
  export namespace Switch {
    type Props = any;
    namespace Root { type Props = any; }
    namespace Thumb { type Props = any; }
  }
}

declare module '@base-ui/react/tabs' {
  export const Tabs: any;
  export namespace Tabs {
    type Props = any;
    namespace Root { type Props = any; }
    namespace List { type Props = any; }
    namespace Tab { type Props = any; }
    namespace Panel { type Props = any; }
    namespace Indicator { type Props = any; }
  }
}

declare module '@base-ui/react/tooltip' {
  export const Tooltip: any;
  export namespace Tooltip {
    type Props = any;
    namespace Root { type Props = any; }
    namespace Trigger { type Props = any; }
    namespace Portal { type Props = any; }
    namespace Positioner { type Props = any; }
    namespace Popup { type Props = any; }
    namespace Arrow { type Props = any; }
    namespace Provider { type Props = any; }
  }
}

declare module '@base-ui/react/*' {
  const content: any;
  export default content;
}
