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

export default function DatePicker({
  value,
  onChange,
  mode = "date",
  display = "default",
  style,
}: DatePickerProps) {
  if (Platform.OS === "web") {
    const dateValue =
      value instanceof Date ? value.toISOString().split("T")[0] : value;

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
          onChange(e.target.value);
        }
      },
    });
  }

  return (
    <NativeDateTimePicker
      value={value instanceof Date ? value : new Date(value || Date.now())}
      mode={mode}
      display={display}
      onChange={(_, selectedDate) => {
        if (selectedDate) {
          onChange(selectedDate.toISOString().split("T")[0]);
        }
      }}
      style={style}
    />
  );
}
