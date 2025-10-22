import React from "react";

const NextImage = React.forwardRef<
  HTMLImageElement,
  React.ComponentProps<"img">
>(({ alt, ...props }, ref) => <img ref={ref} alt={alt} {...props} />);

NextImage.displayName = "MockNextImage";

export default NextImage;
