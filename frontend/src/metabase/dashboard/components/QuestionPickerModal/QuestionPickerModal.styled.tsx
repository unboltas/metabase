import styled from "@emotion/styled";
import type React from "react";

import { Box } from "metabase/ui";

export const QuestionPickerContainer = styled(Box)<React.PropsWithChildren>`
  height: 600px;
  overflow-y: auto;
`;
