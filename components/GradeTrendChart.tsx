import React, { useState } from "react";
import {
  Dimensions,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import Svg, { Circle, Line, Path, Text as SvgText } from "react-native-svg";
import { parseLocalDate } from "../components/DatePicker";
import { Assignment } from "../context/AssignmentsContext";
import { Course } from "../context/CoursesContext";
import { formatDateToYYYYMMDD } from "./DatePicker";

type DataPoint = {
  date: Date;
  grade: number;
  type: "course" | "assignment";
  label?: string;
};

type GradeChartProps = {
  course: Course;
  assignments: Assignment[];
  width?: number;
  height?: number;
  padding?: number;
};

const GradeChart: React.FC<GradeChartProps> = ({
  course,
  assignments,
  width = Dimensions.get("window").width - 40,
  height = 240,
  padding = 30,
}) => {
  const [selectedPoint, setSelectedPoint] = useState<DataPoint | null>(null);
  const [hoveredPoint, setHoveredPoint] = useState<DataPoint | null>(null);
  const isWeb = Platform.OS === "web";

  const displayedPoint = isWeb ? hoveredPoint || selectedPoint : selectedPoint;

  if (!course.gradeHistory?.length && !assignments.length) {
    return (
      <View style={styles.emptyContainer}>
        <Text style={styles.emptyText}>No grade data available</Text>
      </View>
    );
  }

  const dataPoints: DataPoint[] = [
    ...(course.gradeHistory || []).map((point) => ({
      date: parseLocalDate(point.date),
      grade: point.grade,
      type: "course" as const,
    })),
    ...assignments
      .filter((a) => a.courseId === course.id && a.grade !== undefined)
      .map((a) => ({
        date: parseLocalDate(a.dueDate),
        grade: a.grade || 0,
        type: "assignment" as const,
        label: a.title,
      })),
  ].sort((a, b) => a.date.getTime() - b.date.getTime());

  if (!dataPoints.length) {
    return (
      <View style={styles.emptyContainer}>
        <Text style={styles.emptyText}>No grade data available</Text>
      </View>
    );
  }

  const leftPadding = 45;
  const rightPadding = 20;
  const topPadding = padding;
  const bottomPadding = padding + 10;

  const containerInnerWidth = width - 32;
  const chartWidth = containerInnerWidth - leftPadding - rightPadding;
  const chartHeight = height - topPadding - bottomPadding;

  const minDate = new Date(
    Math.min(...dataPoints.map((d) => d.date.getTime()))
  );
  const maxDate = new Date(
    Math.max(...dataPoints.map((d) => d.date.getTime()))
  );

  const dateRange = maxDate.getTime() - minDate.getTime();
  if (dateRange === 0) {
    minDate.setDate(minDate.getDate() - 7);
    maxDate.setDate(maxDate.getDate() + 7);
  } else {
    const datePadding = dateRange * 0.05;
    minDate.setTime(minDate.getTime() - datePadding);
    maxDate.setTime(maxDate.getTime() + datePadding);
  }

  const getX = (date: Date): number => {
    const percent =
      (date.getTime() - minDate.getTime()) /
      (maxDate.getTime() - minDate.getTime());
    return leftPadding + percent * chartWidth;
  };

  const getY = (grade: number): number => {
    return height - bottomPadding - (grade / 100) * chartHeight;
  };

  const yTicks = [0, 25, 50, 75, 100];
  const xTicks = generateDateTicks(minDate, maxDate);

  const coursePoints = dataPoints.filter((p) => p.type === "course");

  const linePath =
    coursePoints.length > 1
      ? coursePoints
          .map(
            (point, i) =>
              (i === 0 ? "M" : "L") + `${getX(point.date)},${getY(point.grade)}`
          )
          .join(" ")
      : "";

  const formatDate = (date: Date): string => {
    return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  };

  const svgWidth = containerInnerWidth;

  return (
    <View style={styles.container}>
      <View style={styles.chartContainer}>
        <Svg width={svgWidth} height={height}>
          {/* Y-axis */}
          <Line
            x1={leftPadding}
            y1={topPadding}
            x2={leftPadding}
            y2={height - bottomPadding}
            stroke="#ccc"
            strokeWidth="1"
          />

          {/* Y-axis ticks and labels */}
          {yTicks.map((tick) => (
            <React.Fragment key={`y-tick-${tick}`}>
              <Line
                x1={leftPadding - 5}
                y1={getY(tick)}
                x2={leftPadding}
                y2={getY(tick)}
                stroke="#ccc"
                strokeWidth="1"
              />
              <SvgText
                x={leftPadding - 10}
                y={getY(tick) + 4}
                textAnchor="end"
                fontSize="10"
                fill="#666"
              >
                {tick}%
              </SvgText>
              <Line
                x1={leftPadding}
                y1={getY(tick)}
                x2={svgWidth - rightPadding}
                y2={getY(tick)}
                stroke="#eee"
                strokeWidth="1"
                strokeDasharray="3,3"
              />
            </React.Fragment>
          ))}

          {/* X-axis */}
          <Line
            x1={leftPadding}
            y1={height - bottomPadding}
            x2={svgWidth - rightPadding}
            y2={height - bottomPadding}
            stroke="#ccc"
            strokeWidth="1"
          />

          {/* X-axis ticks and labels */}
          {xTicks.map((date, i) => (
            <React.Fragment key={`x-tick-${i}`}>
              <Line
                x1={getX(date)}
                y1={height - bottomPadding}
                x2={getX(date)}
                y2={height - bottomPadding + 5}
                stroke="#ccc"
                strokeWidth="1"
              />
              <SvgText
                x={getX(date)}
                y={height - bottomPadding + 16}
                textAnchor="middle"
                fontSize="9"
                fill="#666"
                rotation="0"
              >
                {formatDate(date)}
              </SvgText>
            </React.Fragment>
          ))}

          {/* Course grade line */}
          {coursePoints.length > 1 && (
            <Path d={linePath} fill="none" stroke="#3b82f6" strokeWidth="2" />
          )}

          {/* Data points */}
          {dataPoints.map((point, i) => {
            const isSelected = displayedPoint === point;

            const webProps = isWeb
              ? {
                  onMouseEnter: () => setHoveredPoint(point),
                  onMouseLeave: () => setHoveredPoint(null),

                  style: {
                    cursor: "pointer",
                  },
                }
              : {};

            return (
              <Circle
                key={`point-${i}`}
                cx={getX(point.date)}
                cy={getY(point.grade)}
                r={isSelected ? "7" : "6"}
                fill={point.type === "course" ? "#3b82f6" : "#ef4444"}
                stroke="#fff"
                strokeWidth="2"
                onPress={() =>
                  setSelectedPoint(point === selectedPoint ? null : point)
                }
                {...webProps}
              />
            );
          })}

          {/* Point labels for selected point */}
          {displayedPoint && (
            <>
              <Circle
                cx={getX(displayedPoint.date)}
                cy={getY(displayedPoint.grade)}
                r="8"
                fill="none"
                stroke="#000"
                strokeWidth="1"
              />
              <SvgText
                x={getX(displayedPoint.date)}
                y={getY(displayedPoint.grade) - 12}
                textAnchor="middle"
                fontSize="12"
                fontWeight="bold"
                fill="#000"
              >
                {displayedPoint.grade}%
              </SvgText>
            </>
          )}
        </Svg>

        {displayedPoint && (
          <View
            style={[
              styles.tooltip,
              {
                left: Math.max(
                  10,
                  Math.min(getX(displayedPoint.date) - 100, svgWidth - 210)
                ),
                top: getY(displayedPoint.grade) - 90,
                opacity: displayedPoint ? 1 : 0,
              },
            ]}
          >
            <Text style={styles.tooltipTitle}>
              {displayedPoint.type === "course"
                ? "Course Grade"
                : displayedPoint.label}
            </Text>
            <Text style={styles.tooltipDate}>
              {formatDate(displayedPoint.date)}
            </Text>
            <Text style={styles.tooltipGrade}>{displayedPoint.grade}%</Text>
          </View>
        )}
      </View>

      <View style={styles.legend}>
        <View style={styles.legendItem}>
          <View style={[styles.legendDot, { backgroundColor: "#3b82f6" }]} />
          <Text style={styles.legendText}>Course Grades</Text>
        </View>
        <View style={styles.legendItem}>
          <View style={[styles.legendDot, { backgroundColor: "#ef4444" }]} />
          <Text style={styles.legendText}>Assignment Grades</Text>
        </View>
      </View>

      {/* Point details section */}
      <View style={styles.detailsContainer}>
        <Text style={styles.detailsTitle}>Grade Points</Text>
        <ScrollView style={styles.detailsScroll}>
          {dataPoints.map((point, i) => (
            <TouchableOpacity
              key={`detail-${i}`}
              style={[
                styles.detailItem,
                selectedPoint === point && styles.selectedDetailItem,
              ]}
              onPress={() =>
                setSelectedPoint(point === selectedPoint ? null : point)
              }
            >
              <View
                style={[
                  styles.detailDot,
                  {
                    backgroundColor:
                      point.type === "course" ? "#3b82f6" : "#ef4444",
                  },
                ]}
              />
              <View style={styles.detailContent}>
                <Text style={styles.detailTitle}>
                  {point.type === "course" ? "Course Grade" : point.label}
                </Text>
                <Text style={styles.detailDate}>{formatDate(point.date)}</Text>
              </View>
              <Text style={styles.detailGrade}>{point.grade}%</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>
    </View>
  );
};

export function normalizeDateStringToYYYYMMDD(dateString: string): string {
  const dateObject = new Date(dateString);

  return formatDateToYYYYMMDD(dateObject);
}

function generateDateTicks(minDate: Date, maxDate: Date): Date[] {
  const dateRange = maxDate.getTime() - minDate.getTime();
  const dayRange = dateRange / (1000 * 60 * 60 * 24);

  let interval: number;
  if (dayRange <= 14) {
    interval = 1;
  } else if (dayRange <= 60) {
    interval = 7;
  } else if (dayRange <= 365) {
    interval = 30;
  } else {
    interval = 90;
  }

  const ticks: Date[] = [];
  let currentDate = new Date(minDate);

  while (currentDate <= maxDate) {
    ticks.push(new Date(currentDate));
    currentDate.setDate(currentDate.getDate() + interval);
  }

  if (ticks.length > 8) {
    const step = Math.ceil(ticks.length / 6);
    return ticks.filter((_, i) => i % step === 0);
  }

  return ticks;
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 16,
    marginVertical: 10,
  },
  chartContainer: {
    position: "relative",
    height: 240,
    alignItems: "center",
  },
  emptyContainer: {
    height: 240,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#f8fafc",
    borderRadius: 12,
  },
  emptyText: {
    color: "#94a3b8",
    fontSize: 14,
  },
  legend: {
    flexDirection: "row",
    justifyContent: "center",
    marginVertical: 10,
    gap: 16,
  },
  legendItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  legendDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  legendText: {
    fontSize: 12,
    color: "#6b7280",
  },
  tooltip: {
    position: "absolute",
    backgroundColor: "rgba(0,0,0,0.75)",
    padding: 8,
    borderRadius: 4,
    width: 200,
    zIndex: 10,
  },
  tooltipTitle: {
    color: "#fff",
    fontWeight: "600",
    fontSize: 12,
    marginBottom: 2,
  },
  tooltipDate: {
    color: "#ccc",
    fontSize: 11,
  },
  tooltipGrade: {
    color: "#fff",
    fontWeight: "700",
    fontSize: 14,
  },
  detailsContainer: {
    marginTop: 16,
    borderTopWidth: 1,
    borderTopColor: "#f1f5f9",
    paddingTop: 12,
    maxHeight: 200,
  },
  detailsTitle: {
    fontSize: 14,
    fontWeight: "600",
    color: "#4b5563",
    marginBottom: 8,
  },
  detailsScroll: {
    maxHeight: 160,
  },
  detailItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 8,
    paddingHorizontal: 4,
    borderRadius: 6,
  },
  selectedDetailItem: {
    backgroundColor: "#f0f9ff",
  },
  detailDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 8,
  },
  detailContent: {
    flex: 1,
  },
  detailTitle: {
    fontSize: 13,
    fontWeight: "500",
    color: "#111827",
  },
  detailDate: {
    fontSize: 11,
    color: "#6b7280",
  },
  detailGrade: {
    fontSize: 14,
    fontWeight: "600",
    color: "#111827",
  },
});

export default GradeChart;
