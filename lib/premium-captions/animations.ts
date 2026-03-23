export const buildAnimationString = (type: string) => {
    if (type === "tiktok") {
        return "const scale = isCurrentWord ? spring({ frame: frame - captionStartFrame, fps, config: { damping: 10, mass: 0.5, stiffness: 200 } }) * 0.2 + 1 : 1;";
    }
    return "";
};
