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

export function GridBackground({
  cellMargin,
  cellSize,
  cols,
  width,
  height,
}: GridBackgroundProps) {
  const [horizontalMargin, verticalMargin] = cellMargin;
  const rowHeight = cellSize.height + verticalMargin;
  const rows = Math.ceil(height / rowHeight);

  return (
    <svg width={width} height={height}>
      {_.times(rows, rowIndex =>
        _.times(cols, colIndex => {
          const x = colIndex * (cellSize.width + horizontalMargin);
          const y = rowIndex * rowHeight;
          const key = `${x}:${y}`;
          return <GridBackgroundCell key={key} x={x} y={y} {...cellSize} />;
        }),
      )}
    </svg>
  );
}

interface GridBackgroundCellProps {
  x: number;
  y: number;
  width: number;
  height: number;
}

function GridBackgroundCell({ x, y, width, height }: GridBackgroundCellProps) {
  return (
    <ActiveSvgRect x={x} y={y} width={width} height={height} strokeWidth={1} />
  );
}

const ActiveSvgRect = styled.rect`
  cursor: pointer;
  pointer-events: all;

  fill: none;
  stroke: ${color("border")};

  &:hover {
    stroke: ${color("white")};
    fill: ${color("brand")};
  }
`;
