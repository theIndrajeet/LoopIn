// Animation utilities and configurations
import { Variants } from "framer-motion";

// Page transition animations
export const pageTransition: Variants = {
  initial: { 
    opacity: 0, 
    y: 20,
    scale: 0.98
  },
  animate: { 
    opacity: 1, 
    y: 0,
    scale: 1,
    transition: {
      duration: 0.4,
      ease: [0.25, 0.46, 0.45, 0.94]
    }
  },
  exit: { 
    opacity: 0, 
    y: -20,
    scale: 0.98,
    transition: {
      duration: 0.3,
      ease: [0.25, 0.46, 0.45, 0.94]
    }
  }
};

// Card animations
export const cardVariants: Variants = {
  initial: { 
    opacity: 0, 
    y: 20,
    scale: 0.95
  },
  animate: { 
    opacity: 1, 
    y: 0,
    scale: 1,
    transition: {
      duration: 0.3,
      ease: "easeOut"
    }
  },
  hover: {
    y: -4,
    scale: 1.02,
    transition: {
      duration: 0.2,
      ease: "easeOut"
    }
  },
  tap: {
    scale: 0.98,
    transition: {
      duration: 0.1
    }
  }
};

// Stagger animations for lists
export const containerVariants: Variants = {
  initial: {},
  animate: {
    transition: {
      staggerChildren: 0.1,
      delayChildren: 0.2
    }
  }
};

export const itemVariants: Variants = {
  initial: { 
    opacity: 0, 
    y: 20,
    scale: 0.95
  },
  animate: { 
    opacity: 1, 
    y: 0,
    scale: 1,
    transition: {
      duration: 0.3,
      ease: "easeOut"
    }
  }
};

// Success/completion animations
export const successVariants: Variants = {
  initial: { 
    scale: 0.8, 
    opacity: 0,
    rotate: -10
  },
  animate: { 
    scale: 1, 
    opacity: 1,
    rotate: 0,
    transition: {
      type: "spring",
      stiffness: 300,
      damping: 20
    }
  }
};

// Notification animations
export const notificationVariants: Variants = {
  initial: { 
    opacity: 0, 
    x: 300,
    scale: 0.9
  },
  animate: { 
    opacity: 1, 
    x: 0,
    scale: 1,
    transition: {
      type: "spring",
      stiffness: 400,
      damping: 25
    }
  },
  exit: { 
    opacity: 0, 
    x: 300,
    scale: 0.9,
    transition: {
      duration: 0.2,
      ease: "easeIn"
    }
  }
};

// Loading animations
export const loadingVariants: Variants = {
  initial: { opacity: 0 },
  animate: { 
    opacity: 1,
    transition: {
      duration: 0.3
    }
  },
  exit: { 
    opacity: 0,
    transition: {
      duration: 0.2
    }
  }
};

// Pulse animation for loading states
export const pulseVariants: Variants = {
  animate: {
    scale: [1, 1.05, 1],
    opacity: [0.7, 1, 0.7],
    transition: {
      duration: 2,
      repeat: Infinity,
      ease: "easeInOut"
    }
  }
};

// Slide animations for mobile navigation
export const slideVariants: Variants = {
  initial: { x: "-100%" },
  animate: { 
    x: 0,
    transition: {
      type: "spring",
      stiffness: 300,
      damping: 30
    }
  },
  exit: { 
    x: "-100%",
    transition: {
      duration: 0.2,
      ease: "easeIn"
    }
  }
};

// Bounce animation for interactive elements
export const bounceVariants: Variants = {
  tap: {
    scale: 0.95,
    transition: {
      type: "spring",
      stiffness: 400,
      damping: 10
    }
  }
};

// Fade animations
export const fadeVariants: Variants = {
  initial: { opacity: 0 },
  animate: { 
    opacity: 1,
    transition: {
      duration: 0.4,
      ease: "easeOut"
    }
  },
  exit: { 
    opacity: 0,
    transition: {
      duration: 0.2,
      ease: "easeIn"
    }
  }
};

// Scale animations for modals
export const modalVariants: Variants = {
  initial: { 
    opacity: 0, 
    scale: 0.9,
    y: 20
  },
  animate: { 
    opacity: 1, 
    scale: 1,
    y: 0,
    transition: {
      type: "spring",
      stiffness: 300,
      damping: 25
    }
  },
  exit: { 
    opacity: 0, 
    scale: 0.9,
    y: 20,
    transition: {
      duration: 0.2,
      ease: "easeIn"
    }
  }
};

// Habit completion celebration
export const celebrationVariants: Variants = {
  initial: { 
    scale: 0.5, 
    opacity: 0,
    rotate: -180
  },
  animate: { 
    scale: [0.5, 1.2, 1], 
    opacity: 1,
    rotate: 0,
    transition: {
      duration: 0.6,
      times: [0, 0.6, 1],
      type: "spring",
      stiffness: 200,
      damping: 15
    }
  }
};

// Progress bar animations
export const progressVariants: Variants = {
  initial: { width: 0 },
  animate: (progress: number) => ({
    width: `${progress}%`,
    transition: {
      duration: 0.8,
      ease: "easeOut"
    }
  })
};
