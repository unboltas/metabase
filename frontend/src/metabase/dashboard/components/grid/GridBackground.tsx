import { useCallback, useState } from "react";
import _ from "underscore";
import { t } from "ttag";
import styled from "@emotion/styled";
import { Menu } from "metabase/ui";
import { Icon } from "metabase/core/components/Icon";
import { color } from "metabase/lib/colors";
import { useDispatch, useSelector } from "metabase/lib/redux";
import {
  addCardToDashboard,
  addHeadingDashCardToDashboard,
  addMarkdownDashCardToDashboard,
  addLinkDashCardToDashboard,
} from "metabase/dashboard/actions";
import { getDashboard, getSelectedTabId } from "metabase/dashboard/selectors";

interface GridBackgroundProps {
  cellSize: { width: number; height: number };
  cellMargin: [number, number];
  cols: number;
  width: number;
  height: number;
}

type Point = { x: number; y: number };

function isSamePoint(p1: Point, p2: Point) {
  return p1.x === p2.x && p1.y === p2.y;
}

export function GridBackground({
  cellMargin,
  cellSize,
  cols,
  width,
  height,
}: GridBackgroundProps) {
  const [selectedPoint, setSelectedPoint] = useState<Point | null>(null);
  const [hoveredPoint, setHoveredPoint] = useState<Point | null>(null);
  const [secondPoint, setSecondPoint] = useState<Point | null>(null);

  const [horizontalMargin, verticalMargin] = cellMargin;
  const rowHeight = cellSize.height + verticalMargin;
  const rows = Math.ceil(height / rowHeight);

  const handleCellClick = useCallback(
    (point: Point) => {
      if (!selectedPoint) {
        setSelectedPoint(point);
        setSecondPoint(null);
        return;
      }

      if (isSamePoint(selectedPoint, point)) {
        setSelectedPoint(null);
        setSecondPoint(null);
        return;
      }

      if (!secondPoint) {
        setSecondPoint(point);
      } else {
        setSelectedPoint(point);
        setSecondPoint(null);
      }
    },
    [selectedPoint, secondPoint],
  );

  const checkPointActive = useCallback(
    (point: Point) => {
      if (!selectedPoint || !hoveredPoint) {
        return false;
      }

      const [minX, maxX] = _.sortBy([selectedPoint.x, hoveredPoint.x]);
      const [minY, maxY] = _.sortBy([selectedPoint.y, hoveredPoint.y]);

      return (
        point.x >= minX && point.x <= maxX && point.y >= minY && point.y <= maxY
      );
    },
    [selectedPoint, hoveredPoint],
  );

  const dispatch = useDispatch();

  const dashId = useSelector(getDashboard).id;
  const tabId = useSelector(getSelectedTabId);

  const nextCardPosition =
    !!selectedPoint && !!secondPoint
      ? {
          col: selectedPoint.x,
          row: selectedPoint.y,
          size_x: Math.abs(selectedPoint.x - secondPoint.x) + 1,
          size_y: Math.abs(selectedPoint.y - secondPoint.y) + 1,
        }
      : {};

  const handleAddQuestion = () => {
    dispatch(
      addCardToDashboard({
        dashId,
        cardId: 1,
        tabId,
        position: nextCardPosition,
      }),
    );
    setSelectedPoint(null);
    setSecondPoint(null);
  };

  const handleAddHeading = () => {
    dispatch(
      addHeadingDashCardToDashboard({
        dashId,
        tabId,
        position: nextCardPosition,
      }),
    );
    setSelectedPoint(null);
    setSecondPoint(null);
  };

  const handleAddText = () => {
    dispatch(
      addMarkdownDashCardToDashboard({
        dashId,
        tabId,
        position: nextCardPosition,
      }),
    );
    setSelectedPoint(null);
    setSecondPoint(null);
  };

  const handleAddLink = () => {
    dispatch(
      addLinkDashCardToDashboard({
        dashId,
        tabId,
        position: nextCardPosition,
      }),
    );
    setSelectedPoint(null);
    setSecondPoint(null);
  };

  return (
    <Menu opened={!!selectedPoint && !!secondPoint} withinPortal>
      <Menu.Dropdown>
        <Menu.Item icon={<Icon name="insight" />} onClick={handleAddQuestion}>
          {t`Question`}
        </Menu.Item>
        <Menu.Item icon={<Icon name="string" />} onClick={handleAddHeading}>
          {t`Heading`}
        </Menu.Item>
        <Menu.Item icon={<Icon name="list" />} onClick={handleAddText}>
          {t`Text box`}
        </Menu.Item>
        <Menu.Item icon={<Icon name="link" />} onClick={handleAddLink}>
          {t`Link`}
        </Menu.Item>
        <Menu.Item icon={<Icon name="filter" />} disabled>
          {t`Filter`}
        </Menu.Item>
        <Menu.Item icon={<Icon name="click" />} disabled>
          {t`Button`}
        </Menu.Item>
      </Menu.Dropdown>
      <svg width={width} height={height}>
        {_.times(rows, rowIndex =>
          _.times(cols, colIndex => {
            const point = { x: colIndex, y: rowIndex };
            const key = `${point.x}:${point.y}`;

            const x = colIndex * (cellSize.width + horizontalMargin);
            const y = rowIndex * rowHeight;

            const cell = (
              <ActiveSvgRect
                key={key}
                x={x}
                y={y}
                {...cellSize}
                strokeWidth={1}
                isActive={checkPointActive(point)}
                onClick={() => handleCellClick(point)}
                onMouseOver={
                  selectedPoint && !secondPoint
                    ? () => setHoveredPoint(point)
                    : undefined
                }
              />
            );

            if (
              selectedPoint &&
              secondPoint &&
              isSamePoint(point, secondPoint)
            ) {
              return <Menu.Target key={key}>{cell}</Menu.Target>;
            }

            // if (selectedPoint && secondPoint && isSamePoint(point, secondPoint)) {
            //   const size_x = Math.abs(selectedPoint.x - secondPoint.x) + 1;
            //   const size_y = Math.abs(selectedPoint.y - secondPoint.y) + 1;

            //   const nextCardPosition = {
            //     col: point.x,
            //     row: point.y,
            //     size_x,
            //     size_y,
            //   };

            //   return (
            //     <NewDashCardMenu
            //       defaultOpened
            //       nextCardPosition={nextCardPosition}
            //     >
            //       <ActiveSvgRect
            //         key={key}
            //         x={x}
            //         y={y}
            //         {...cellSize}
            //         strokeWidth={1}
            //         isActive={checkPointActive(point)}
            //         onClick={() => handleCellClick(point)}
            //         onMouseOver={
            //           selectedPoint && !secondPoint
            //             ? () => setHoveredPoint(point)
            //             : undefined
            //         }
            //       />
            //     </NewDashCardMenu>
            //   );
            // }

            return cell;
          }),
        )}
      </svg>
    </Menu>
  );
}

const ActiveSvgRect = styled.rect<{ isActive: boolean }>`
  cursor: pointer;
  pointer-events: all;

  fill: ${props => (props.isActive ? color("brand") : "none")};
  stroke: ${props => (props.isActive ? color("white") : color("border"))};

  &:hover {
    stroke: ${color("white")};
    fill: ${color("brand")};
  }
`;
