import React from "react";

const NextLink = React.forwardRef<HTMLAnchorElement, React.ComponentProps<"a">>(
  ({ children, ...props }, ref) => (
    <a ref={ref} {...props}>
      {children}
    </a>
  )
);

NextLink.displayName = "MockNextLink";

export default NextLink;
