import styled from "@emotion/styled";

import { color } from "metabase/lib/colors";
import { SearchResult } from "metabase/search/components/SearchResult";

export const EntityPickerSearchResult = styled(SearchResult)<{
  isSelected: boolean;
}>`
  width: 40rem;
  border: 1px solid
    ${({ isSelected }) => (isSelected ? color("brand") : "transparent")};
  margin-bottom: 1px;
`;

export const ChunkyListItem = styled.button<{ isSelected: boolean }>`
  padding: 1.5rem;
  cursor: pointer;

  background-color: ${({ isSelected }) =>
    isSelected ? color("brand") : "white"};

  color: ${({ isSelected }) =>
    isSelected ? color("white") : color("text-dark")};

  font-weight: bold;

  &:hover {
    background-color: ${color("brand-lighter")};
    color: ${color("text-dark")};
  }

  border-bottom: 1px solid ${color("border")};

  display: flex;
  justify-content: space-between;
  align-items: center;
  width: 100%;
`;

export const ChunkyList = styled.div`
  border: 1px solid ${color("border")};
  border-radius: 0.25rem;
  display: flex;
  flex-direction: column;
  overflow: hidden;
`;
