// jest.config.ts
export default {
     preset: "ts-jest/presets/default",
    testEnvironment: "node",
    transform: {
        "^.+\\.ts$": [
            "ts-jest",
            {
                tsconfig: "tsconfig.json",
                useESM: false,
            },
        ],
    },
};
