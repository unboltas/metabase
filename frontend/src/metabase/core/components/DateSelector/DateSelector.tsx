import React, {
  CSSProperties,
  forwardRef,
  Ref,
  useCallback,
  useMemo,
  useState,
} from "react";
import moment, { Duration, Moment } from "moment";
import { t } from "ttag";
import { hasTimePart } from "metabase/lib/time";
import TimeInput from "metabase/core/components/TimeInput";
import Calendar from "metabase/components/Calendar";
import {
  SelectorContent,
  SelectorField,
  SelectorFieldLabel,
  SelectorFooter,
  SelectorSubmitButton,
  SelectorTimeButton,
} from "./DateSelector.styled";
import Select from "metabase/core/components/Select";

export interface DateSelectorProps {
  className?: string;
  style?: CSSProperties;
  value?: Moment;
  hasTime?: boolean;
  timezone?: string;
  timezones?: TimezoneOption[];
  onChange?: (date?: Moment) => void;
  onChangeTimezone?: (timezone: string) => void;
  onSubmit?: () => void;
}

export interface TimezoneOption {
  name: string;
  value: string;
}

const DateSelector = forwardRef(function DateSelector(
  {
    className,
    style,
    value,
    hasTime,
    timezone,
    timezones,
    onChange,
    onChangeTimezone,
    onSubmit,
  }: DateSelectorProps,
  ref: Ref<HTMLDivElement>,
): JSX.Element {
  const [isTimeShown, setIsTimeShown] = useState(hasTime && hasTimePart(value));

  const time = useMemo(() => {
    return moment.duration({
      hours: value?.hours(),
      minutes: value?.minutes(),
    });
  }, [value]);

  const handleDateChange = useCallback(
    (unused1: string, unused2: string, dateStart: Moment) => {
      const newDate = dateStart.clone().local();
      newDate.hours(value ? value.hours() : 0);
      newDate.minutes(value ? value.minutes() : 0);
      onChange?.(newDate);
    },
    [value, onChange],
  );

  const handleTimeChange = useCallback(
    (newTime?: Duration) => {
      const newDate = value ? value.clone() : moment().startOf("date");
      newDate.hours(newTime ? newTime.hours() : 0);
      newDate.minutes(newTime ? newTime.minutes() : 0);
      onChange?.(newDate);
      setIsTimeShown(newTime != null);
    },
    [value, onChange],
  );

  const handleTimeClick = useCallback(() => {
    const newDate = value ? value.clone() : moment().startOf("date");
    onChange?.(newDate);
    setIsTimeShown(true);
  }, [value, onChange]);

  return (
    <div ref={ref} className={className} style={style}>
      <Calendar
        initial={value}
        selected={value}
        isRangePicker={false}
        onChange={handleDateChange}
      />
      <SelectorContent>
        {isTimeShown && (
          <SelectorField>
            <TimeInput value={time} onChange={handleTimeChange} />
          </SelectorField>
        )}
        {isTimeShown && (
          <SelectorField>
            <SelectorFieldLabel>{t`Timezone`}</SelectorFieldLabel>
            <Select
              value={timezone}
              options={timezones}
              onChange={onChangeTimezone}
            />
          </SelectorField>
        )}
        <SelectorFooter>
          {hasTime && !isTimeShown && (
            <SelectorTimeButton
              icon="clock"
              borderless
              onClick={handleTimeClick}
            >
              {t`Add time`}
            </SelectorTimeButton>
          )}
          <SelectorSubmitButton primary onClick={onSubmit}>
            {t`Save`}
          </SelectorSubmitButton>
        </SelectorFooter>
      </SelectorContent>
    </div>
  );
});

export default DateSelector;
