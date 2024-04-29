import { useLayoutEffect, useState } from "react";
import { useDebounce } from "react-use";
import { t } from "ttag";

import { useSearchQuery } from "metabase/api";
import EmptyState from "metabase/components/EmptyState";
import { VirtualizedList } from "metabase/components/VirtualizedList";
import { NoObjectError } from "metabase/components/errors/NoObjectError";
import { SearchLoadingSpinner } from "metabase/nav/components/search/SearchResults";
import { Box, Flex, Icon, Stack, Tabs, TextInput } from "metabase/ui";
import type { SearchModel, SearchResultId } from "metabase-types/api";

import type { TypeWithModel } from "../../types";

import { ChunkyList } from "./EntityPickerSearch.styled";
import { EntityPickerSearchResult } from "./EntityPickerSearchResult";
import { getSearchTabText } from "./utils";

const defaultSearchFilter = <
  Id,
  Model extends string,
  Item extends TypeWithModel<Id, Model>,
>(
  results: Item[],
) => results;

export function EntityPickerSearchInput<
  Id extends SearchResultId,
  Model extends SearchModel,
  Item extends TypeWithModel<Id, Model>,
>({
  searchQuery,
  setSearchQuery,
  setSearchResults,
  models,
  searchFilter = defaultSearchFilter,
}: {
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  setSearchResults: (results: Item[] | null) => void;
  models: SearchModel[];
  searchFilter?: (results: Item[]) => Item[];
}) {
  const [debouncedSearchQuery, setDebouncedSearchQuery] = useState(searchQuery);
  useDebounce(() => setDebouncedSearchQuery(searchQuery), 200, [searchQuery]);

  const { data, isFetching } = useSearchQuery(
    {
      q: debouncedSearchQuery,
      models,
    },
    {
      skip: !debouncedSearchQuery,
    },
  );

  useLayoutEffect(() => {
    if (data && !isFetching) {
      setSearchResults(searchFilter(data.data as unknown as Item[]));
    } else {
      setSearchResults(null);
    }
  }, [data, isFetching, searchFilter, setSearchResults]);

  return (
    <TextInput
      type="search"
      icon={<Icon name="search" size={16} />}
      miw={400}
      mr="2rem"
      value={searchQuery}
      onChange={e => setSearchQuery(e.target.value ?? "")}
      placeholder={t`Search…`}
    />
  );
}

export const EntityPickerSearchResults = <
  Id,
  Model extends string,
  Item extends TypeWithModel<Id, Model>,
>({
  searchResults,
  onItemSelect,
  selectedItem,
}: {
  searchResults: Item[] | null;
  onItemSelect: (item: Item) => void;
  selectedItem: Item | null;
}) => {
  if (!searchResults) {
    return <SearchLoadingSpinner />;
  }

  return (
    <Box h="100%">
      {searchResults.length > 0 ? (
        <Stack h="100%">
          <VirtualizedList
            Wrapper={({ children, ...props }) => (
              <Box p="lg" {...props}>
                <ChunkyList>{children}</ChunkyList>
              </Box>
            )}
          >
            {searchResults?.map(item => (
              <EntityPickerSearchResult
                key={item.model + item.id}
                item={item}
                onClick={() => {
                  onItemSelect(item as unknown as Item);
                }}
                isSelected={
                  selectedItem?.id === item.id &&
                  selectedItem?.model === item.model
                }
              />
            ))}
          </VirtualizedList>
        </Stack>
      ) : (
        <Flex direction="column" justify="center" h="100%">
          <EmptyState
            title={t`Didn't find anything`}
            message={t`There weren't any results for your search.`}
            illustrationElement={<NoObjectError mb="-1.5rem" />}
          />
        </Flex>
      )}
    </Box>
  );
};

export const EntityPickerSearchTab = <
  Id,
  Model extends string,
  Item extends TypeWithModel<Id, Model>,
>({
  searchResults,
  searchQuery,
  onClick,
}: {
  searchResults: Item[] | null;
  searchQuery: string;
  onClick: () => void;
}) => (
  <Tabs.Tab value="search" icon={<Icon name="search" />} onClick={onClick}>
    {getSearchTabText(searchResults, searchQuery)}
  </Tabs.Tab>
);
