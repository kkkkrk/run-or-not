const LINE_COLORS: Record<string, string> = {
    "2호선": "#00A84D",
    "3호선": "#EF7C1C",
    "4호선": "#00A5DE",
    "5호선": "#996CAC",
    "6호선": "#CD7C2F",
    "7호선": "#747F00",
    "9호선": "#BDB092",
    "우이신설선": "#B0CE18",
};
// 나중에 추가 예정
// {
//     "1호선": "#0052A4",
//     "8호선": "#E6186C",
//     "경의중앙선": "#77C4A3",
//     "수인분당선": "#F5A200",
//     "신분당선": "#D4003B",
//     "경춘선": "#0C8E72",
//     "공항철도": "#0090D2",
//     "서해선": "#81A914",
//     "신림선": "#6789CA",
//     "GTX-A": "#9A6292",
//     "경강선": "#003DA5"
// } 

const FALLBACK_COLOR = "#8A8A8A";

export function getLineColor(line: string): string {
    return  LINE_COLORS[line] ?? FALLBACK_COLOR;
}