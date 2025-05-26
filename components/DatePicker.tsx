import NativeDateTimePicker from "@react-native-community/datetimepicker";
import { createElement } from "react";
import { Platform } from "react-native";

interface DatePickerProps {
  value: string | Date;
  onChange: (date: string) => void;
  mode?: "date" | "time" | "datetime";
  display?: "default" | "spinner" | "calendar" | "clock";
  style?: any;
}

export function formatDateToYYYYMMDD(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(
    2,
    "0"
  )}-${String(date.getDate()).padStart(2, "0")}`;
}

export const parseLocalDate = (dateString: string): Date => {
  var offset = 0;
  // if (dateString.length === 10) {
  //   offset = 1;
  // }

  const parts = dateString.split("-");

  // remove end bit of parts[2] to 2 characters
  parts[2] = parts[2].slice(0, 2);

  const numberParts = parts.map(Number);

  console.log("Parsed date string:", dateString);
  console.log("Parsed date parts:", numberParts);
  return new Date(numberParts[0], numberParts[1] - 1, numberParts[2] + offset);
};

export const parseLocalDateToComponents = (dateString: string): number[] => {
  const parts = dateString.split("-");
  const year = parseInt(parts[0], 10);
  const month = parseInt(parts[1], 10);
  const day = parseInt(parts[2], 10);

  return [month, day, year];
};

export const componentsToMMMDDYYYY = (components: number[]): string => {
  const monthNames = [
    "Jan",
    "Feb",
    "Mar",
    "Apr",
    "May",
    "Jun",
    "Jul",
    "Aug",
    "Sep",
    "Oct",
    "Nov",
    "Dec",
  ];

  const month = monthNames[components[0] - 1];
  const day = String(components[1]).padStart(2, "0");
  const year = components[2];

  return `${month} ${day}, ${year}`;
};

export const dateToComponents = (date: Date): number[] => {
  const month = date.getMonth() + 1;
  const day = date.getDate();
  const year = date.getFullYear();

  return [month, day, year];
};

export default function DatePicker({
  value,
  onChange,
  mode = "date",
  display = "default",
  style,
}: DatePickerProps) {
  if (Platform.OS === "web") {
    const dateValue =
      value instanceof Date ? formatDateToYYYYMMDD(value) : value;

    return createElement("input", {
      type: "date",
      value: dateValue,
      style: {
        width: "100%",
        height: 48,
        fontSize: 15,
        padding: 8,
        borderRadius: 8,
        border: "none",
        backgroundColor: "#f1f5f9",
        ...style,
      },
      onChange: (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.value) {
          console.log("Web DatePicker - Selected date:", e.target.value);
          onChange(e.target.value);
        }
      },
    });
  }

  let currentDate: Date;
  if (value instanceof Date) {
    currentDate = value;
  } else if (typeof value === "string" && value.match(/^\d{4}-\d{2}-\d{2}$/)) {
    const [year, month, day] = value.split("-").map(Number);
    currentDate = new Date(year, month - 1, day);
  } else {
    currentDate = new Date();
  }

  return (
    <NativeDateTimePicker
      value={currentDate}
      mode={mode}
      display={display}
      onChange={(_, selectedDate) => {
        if (selectedDate) {
          const formattedDate = formatDateToYYYYMMDD(selectedDate);
          console.log("Native DatePicker - Raw selected date:", selectedDate);
          console.log("Native DatePicker - Formatted date:", formattedDate);
          onChange(formattedDate);
        }
      }}
      style={style}
    />
  );
}
