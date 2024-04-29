import { t } from "ttag";

import { color } from "metabase/lib/colors";
import { getIcon } from "metabase/lib/icon";
import { Icon, Flex, Text, Tooltip } from "metabase/ui";
import type { SearchResult } from "metabase-types/api";

import { ChunkyListItem } from "./EntityPickerSearch.styled";

export const EntityPickerSearchResult = ({
  item,
  isSelected,
  onClick,
}: {
  item: SearchResult;
  isSelected: boolean;
  onClick: () => void;
}) => {
  const icon = getIcon({
    ...item,
    authority_level:
      item.model === "collection"
        ? item?.collection_authority_level
        : item.moderated_status,
  });

  return (
    <ChunkyListItem onClick={onClick} isSelected={isSelected}>
      <Flex gap="md">
        <Icon
          color="brand"
          name={icon.name}
          style={{
            color: color(icon.color ?? (isSelected ? "white" : "brand")),
          }}
        />
        <div>{item.name}</div>
        {item.description && (
          <Tooltip
            maw="20rem"
            multiline
            label={item.description}
            styles={{
              tooltip: {
                // required to get the tooltip to show up over the entity picker modal 😢
                zIndex: "450 !important" as any,
              },
            }}
          >
            <Icon color="brand" name="info" />
          </Tooltip>
        )}
      </Flex>

      {item.model !== "collection" && ( // we don't hydrate parent info for collections right now
        <Flex
          style={{ color: isSelected ? "white" : "text-light" }}
          align="center"
          gap="sm"
          w="20rem"
        >
          <Icon
            color="brand"
            name={getIcon({ model: "collection", ...item.collection }).name}
          />
          <Text fw="normal" color={isSelected ? "white" : "text-light"}>
            {t`in ${item.collection?.name}`}
          </Text>
        </Flex>
      )}
    </ChunkyListItem>
  );
};
