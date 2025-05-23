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

function formatDateToYYYYMMDD(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(
    2,
    "0"
  )}-${String(date.getDate()).padStart(2, "0")}`;
}

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
