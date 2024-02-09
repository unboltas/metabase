import styled from "@emotion/styled";
import { Icon } from "metabase/ui";

export const PopoverHoverTarget = styled(Icon)`
  padding: 0.7em 0.65em;
  opacity: 0;

  path {
    opacity: 0.5;
  }

  &[aria-disabled="true"] {
    path {
      opacity: 0.35;
    }
    pointer-events: none;
  }

  &[aria-expanded="true"] {
    path {
      opacity: 1;
    }
  }
`;