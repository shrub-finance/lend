import React, { useState } from 'react';

const Tooltip = ({ text, children, showOnDisabled = false }) => {
  const [isHovered, setIsHovered] = useState(false);
  const child = React.Children.only(children);
  const isDisabled = child.props.disabled;

  const showTooltip = !showOnDisabled || (showOnDisabled && isDisabled);

  return (
    <div
      className="relative flex items-center"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {React.cloneElement(child, {
        className: child.props.className,
      })}
      {showTooltip && isHovered && (
        <div className="absolute bottom-full mb-2 left-1/2 transform -translate-x-1/2 flex justify-center">
          <div className="relative bg-gray-700 text-white text-xs rounded py-1 px-2 w-40 text-center">
            {text}
            <div className="absolute bottom-[-4px] left-1/2 transform -translate-x-1/2 w-0 h-0 border-l-4 border-l-transparent border-r-4 border-r-transparent border-t-4 border-t-gray-700"></div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Tooltip;
