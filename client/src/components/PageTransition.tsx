import React from "react";
import { CSSTransition, SwitchTransition } from "react-transition-group";
import "./page-transition.css";

interface PageTransitionProps {
  children: React.ReactNode;
  location: string;
}

const PageTransition: React.FC<PageTransitionProps> = ({ children, location }) => {
  return (
    <SwitchTransition>
      <CSSTransition
        key={location}
        classNames="page"
        timeout={300}
        unmountOnExit
      >
        <div className="page-transition-wrapper">{children}</div>
      </CSSTransition>
    </SwitchTransition>
  );
};

export default PageTransition;
