import { useCallback, useState } from "react";
import _ from "underscore";
import styled from "@emotion/styled";
import { color } from "metabase/lib/colors";

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

  return (
    <svg width={width} height={height}>
      {_.times(rows, rowIndex =>
        _.times(cols, colIndex => {
          const x = colIndex * (cellSize.width + horizontalMargin);
          const y = rowIndex * rowHeight;

          const key = `${x}:${y}`;
          const point = { x, y };

          return (
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
        }),
      )}
    </svg>
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
