import * as Select from "@radix-ui/react-select";
import { ChevronDown, Check } from "lucide-react";
import { useMemo } from "react";

type Option = {
    label: string;
    value: string;
    disabled?: boolean;
};

type SmoothSelectProps = {
    value?: string;
    onChange: (value?: string) => void;
    placeholder: string;
    options: Option[];
    disabled?: boolean;
    hasError?: boolean;
};

export const SmoothSelect = ({
    value,
    onChange,
    placeholder,
    options,
    disabled = false,
    hasError = false,
}: SmoothSelectProps) => {
    const normalizedValue = value ?? "";

    const renderedOptions = useMemo(() => {
        if (options.length === 0) {
            return (
                <div className="px-3 py-2 text-sm text-gray-400">
                    No options available
                </div>
            );
        }

        return options.map((opt) => (
            <Select.Item
                key={opt.value}
                value={opt.value}
                disabled={opt.disabled}
                className="
                    relative flex items-center justify-between
                    rounded-lg px-3 py-2 text-sm
                    cursor-pointer select-none
                    outline-none transition
                    data-[highlighted]:bg-blue-50
                    data-[state=checked]:bg-blue-100
                    data-[disabled]:opacity-50
                    data-[disabled]:cursor-not-allowed
                "
            >
                <Select.ItemText>{opt.label}</Select.ItemText>
                <Select.ItemIndicator className="text-blue-600">
                    <Check size={16} />
                </Select.ItemIndicator>
            </Select.Item>
        ));
    }, [options]);

    return (
        <Select.Root
            value={normalizedValue}
            onValueChange={(val) => onChange(val || undefined)}
            disabled={disabled}
        >
            <Select.Trigger
                aria-invalid={hasError}
                className={`
                    inline-flex items-center justify-between gap-2
                    rounded-xl border bg-white px-4 py-3
                    text-sm min-w-[200px]
                    transition shadow-sm
                    focus:outline-none focus:ring-2
                    data-[placeholder]:text-gray-400
                    ${hasError
                        ? "border-red-500 focus:ring-red-500"
                        : "border-gray-200 hover:bg-gray-50 focus:ring-blue-500"
                    }
                    ${disabled ? "opacity-50 cursor-not-allowed" : ""}
                `}
            >
                <Select.Value placeholder={placeholder} />
                <ChevronDown size={18} className="text-gray-500" />
            </Select.Trigger>

            <Select.Portal>
                <Select.Content
                    side="bottom"
                    sideOffset={6}
                    collisionPadding={12}
                    collisionBoundary={[]}
                    position="popper"
                    className="
    z-50 overflow-hidden rounded-xl border bg-white
    shadow-xl animate-in fade-in zoom-in-95
    data-[side=bottom]:slide-in-from-top-2
    data-[side=top]:slide-in-from-bottom-2
    min-w-[var(--radix-select-trigger-width)]
  "
                >

                    <Select.Viewport className="p-1">
                        {renderedOptions}
                    </Select.Viewport>
                </Select.Content>
            </Select.Portal>
        </Select.Root>
    );
};

SmoothSelect.displayName = "SmoothSelect";
