import React, { useRef } from 'react';
import {
    Animated,
    StyleSheet,
    Text,
    TextInput,
    View,
} from 'react-native';
import {C} from "../../constants";

interface InputFieldProps {
    label:            string;
    placeholder:      string;
    value:            string;
    onChangeText:     (v: string) => void;
    secureTextEntry?: boolean;
    keyboardType?:    'default' | 'email-address' | 'phone-pad' | 'numeric';
    isRTL?:           boolean;
}

export function InputField({
                               label,
                               placeholder,
                               value,
                               onChangeText,
                               secureTextEntry = false,
                               keyboardType    = 'default',
                               isRTL           = false,
                           }: InputFieldProps) {
    const anim = useRef(new Animated.Value(0)).current;

    const onFocus = () =>
        Animated.timing(anim, { toValue: 1, duration: 200, useNativeDriver: false }).start();

    const onBlur = () =>
        Animated.timing(anim, { toValue: 0, duration: 200, useNativeDriver: false }).start();

    const borderColor = anim.interpolate({
        inputRange:  [0, 1],
        outputRange: ['#E5E7EB', C.purpleMid],
    });

    return (
        <View style={s.wrap}>
            <Text style={[s.label, isRTL && s.labelRTL]}>{label}</Text>
            <Animated.View style={[s.inputOuter, { borderColor }]}>
                <TextInput
                    style={[s.input, isRTL && s.inputRTL]}
                    placeholder={placeholder}
                    placeholderTextColor="#9CA3AF"
                    value={value}
                    onChangeText={onChangeText}
                    onFocus={onFocus}
                    onBlur={onBlur}
                    secureTextEntry={secureTextEntry}
                    keyboardType={keyboardType}
                    autoCapitalize="none"
                    textAlign={isRTL ? 'right' : 'left'}
                />
            </Animated.View>
        </View>
    );
}

const s = StyleSheet.create({
    wrap: {
        gap: 6,
    },
    label: {
        fontSize:   12,
        fontWeight: '600',
        color:      C.textMuted,
        fontFamily: 'Sora-SemiBold',
    },
    labelRTL: {
        textAlign:  'right',
        fontFamily: 'Tajawal-Bold',
    },
    inputOuter: {
        borderWidth:     1.5,
        borderRadius:    14,
        backgroundColor: C.white,
        overflow:        'hidden',
    },
    input: {
        padding:    14,
        fontSize:   14,
        color:      C.textDark,
        fontFamily: 'Sora-Regular',
    },
    inputRTL: {
        fontFamily: 'Tajawal-Regular',
        textAlign:  'right',
    },
});