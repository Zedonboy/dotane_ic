import { defaultProps } from "@blocknote/core";
import { createReactBlockSpec } from "@blocknote/react";
// The types of alerts that users can choose from.


// The Alert block.
export const Alert = createReactBlockSpec(
  {
    type: "alert",
    propSchema: {
      textAlignment: defaultProps.textAlignment,
      textColor: defaultProps.textColor,
      type: {
        default: "warning",
        values: ["warning", "error", "info", "success"],
      },
    },
    content: "inline",
  },
  {
    render: (props) => {
      return <div>Alert</div>;
    },
  },
);
