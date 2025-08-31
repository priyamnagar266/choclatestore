// Fallback declaration to silence TS error if @types not installed
// Remove this file once you install: npm i -D @types/react-transition-group
declare module 'react-transition-group' {
  import * as React from 'react';
  export interface CSSTransitionProps extends React.HTMLAttributes<HTMLElement> { in?: boolean; timeout?: number | { enter?: number; exit?: number }; classNames?: string | { enter?: string; enterActive?: string; exit?: string; exitActive?: string }; unmountOnExit?: boolean; }
  export class CSSTransition extends React.Component<any> {}
  export class SwitchTransition extends React.Component<any> {}
}
