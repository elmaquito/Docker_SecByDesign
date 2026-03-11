import { ref, watch, onMounted } from 'vue';

const isDarkMode = ref(false);

const toggleTheme = () => {
    isDarkMode.value = !isDarkMode.value;
    updateTheme();
};

const updateTheme = () => {
    if (isDarkMode.value) {
        document.body.classList.add('dark-mode');
        document.documentElement.setAttribute('data-theme', 'dark');
        localStorage.setItem('theme', 'dark');
    } else {
        document.body.classList.remove('dark-mode');
        document.documentElement.setAttribute('data-theme', 'light');
        localStorage.setItem('theme', 'light');
    }
};

const initTheme = () => {
    const savedTheme = localStorage.getItem('theme');
    if (savedTheme === 'dark') {
        isDarkMode.value = true;
    } else if (!savedTheme && window.matchMedia('(prefers-color-scheme: dark)').matches) {
        isDarkMode.value = true;
    }
    updateTheme();
};

export const useTheme = () => {
    onMounted(() => {
        initTheme();
    });

    return {
        isDarkMode,
        toggleTheme
    };
};
