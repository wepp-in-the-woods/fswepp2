import * as React from "react";
import { useFormContext, type FieldPath, type FieldValues } from "react-hook-form";
import { FormField, FormItem, FormLabel, FormControl, FormDescription, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";

type FieldValidator = (value: string) => true | string;

type UnitLabel = string | null;

type FormFieldProps<
    TFieldValues extends FieldValues,
    TName extends FieldPath<TFieldValues>
> = {
    name: TName;
    label?: string;
    type?: React.InputHTMLAttributes<HTMLInputElement>["type"];
    placeholder?: string;
    help?: string;
    required?: boolean;
    unitLabel?: UnitLabel;
    validator?: FieldValidator;
    debounceMs?: number;
    inputClassName?: string;
    labelClassName?: string;
    descriptionClassName?: string;
    value?: string;
    error?: string;
    showValidFlash?: boolean;
    validateOnTouched?: boolean;
};

export function FormFieldText<
    TFieldValues extends FieldValues,
    TName extends FieldPath<TFieldValues>
>({
    name,
    label,
    type = "text",
    placeholder,
    help,
    required = false,
    unitLabel,
    validator,
    debounceMs = 300,
    inputClassName,
    labelClassName,
    descriptionClassName,
    value,
    error,
    showValidFlash = true,
    validateOnTouched = true,
  }: FormFieldProps<TFieldValues, TName>) {
    const { trigger, setError, clearErrors } = useFormContext<TFieldValues>();

    const timerRef = React.useRef<number | null>(null);
    const inputRef = React.useRef<HTMLInputElement | null>(null);
    const touchedRef = React.useRef(false);

    React.useEffect(() => {
        if (error) {
            setError(name, { type: "manual", message: error });
        }
    }, [error, name, setError]);

    const runValidator = React.useCallback(
        (value: string) => {
            if (!validator) return;
            const result = validator(value);
            if (result === true) {
                clearErrors(name);
                if (showValidFlash && inputRef.current) {
                    inputRef.current.classList.add("border-primary");
                    window.setTimeout(
                        () => inputRef.current?.classList.remove("border-primary"),
                        800
                    );
                }
            } else {
                setError(name, { type: "manual", message: result || "Invalid value." });
            }
        },
        [validator, name, setError, clearErrors, showValidFlash]
    );

    const onDebouncedValidate = React.useCallback(
        (value: string) => {
            if (!validator) return;
            if (timerRef.current) window.clearTimeout(timerRef.current);
            timerRef.current = window.setTimeout(() => runValidator(value), debounceMs);
        },
        [validator, debounceMs, runValidator]
    );

    return (
        <FormField
            name={name}
            render={({ field }) => (
                <FormItem>
                    {label && (
                        <FormLabel className={labelClassName}>
                            {label}
                            {required ? <span className="text-destructive ml-1">*</span> : null}
                        </FormLabel>
                    )}
                    <div className="flex items-center gap-2">
                        <FormControl>
                            <Input
                                {...field}
                                type={type}
                                placeholder={placeholder}
                                className={inputClassName}
                                value={value ?? field.value ?? ""}
                                onBlur={(e) => {
                                    field.onBlur();
                                    touchedRef.current = true;
                                    if (validator) {
                                        runValidator(e.target.value);
                                    } else {
                                        trigger(name);
                                    }
                                }}
                                onChange={(e) => {
                                    field.onChange(e);
                                    if (!validator) return;

                                    if (validateOnTouched && !touchedRef.current) {
                                        return;
                                    }
                                    onDebouncedValidate(e.target.value);
                                }}
                            />
                        </FormControl>
                        {unitLabel ? (
                            <span className="text-sm text-muted-foreground">{unitLabel}</span>
                        ) : null}
                    </div>
                    {help ? (
                        <FormDescription className={descriptionClassName}>{help}</FormDescription>
                    ) : null}
                    <FormMessage />
                </FormItem>
            )}
        />
    );
}