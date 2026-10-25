// Hacktivators Event Configuration
export const CONFIG = {
  // Supabase Configuration provided by user
  supabaseUrl: "https://mwqohvrgimpfyduaxrow.supabase.co",
  supabaseAnonKey: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im13cW9odnJnaW1wZnlkdWF4cm93Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTI5MjY2NDksImV4cCI6MjEwODUwMjY0OX0.i6TiH_15wKEdED7wQEzxkXbOlikt0d1RQmZXqjrltTw",
  supabasePublishableKey: "sb_publishable_Wrneh6Vnt7BlZWRRirUpMg_XI9kohvD",

  // Admin access passcode
  adminPasscode: "admin2026",

  // Event metadata from official poster
  event: {
    nameEn: "Hack Day",
    nameAr: "يوم الهاك",
    teamNameEn: "Hacktivators",
    teamNameAr: "هاكتيفيتورز",
    taglineEn: "Innovation • Technology • Impact",
    taglineAr: "تعلّم • ابنِ • ابتكر • معاً",
    subTaglineAr: "مهارات مختلفة - هدف واحد",
    duration: "4 Hours (Non-stop) / 4 ساعات (من غير فواصل)",
    time: "8:00 AM - 12:00 PM / من 8:00 صباحاً إلى 12:00 ظهراً",
    groups: ["A", "B", "C", "D"],
    workshops: [
      {
        id: "emotional_intelligence",
        nameEn: "Emotional Intelligence",
        nameAr: "الذكاء العاطفي",
        icon: "brain",
        color: "purple",
        descAr: "طوّر وعيك بذاتك والآخرين، وتعلّم كيف تتواصل بشكل أفضل وتبني علاقات أقوى.",
        descEn: "Develop awareness of yourself and others, learn effective communication, and build stronger relationships."
      },
      {
        id: "block_programming",
        nameEn: "Block-based Programming",
        nameAr: "البرمجة باستخدام البلوكات",
        icon: "blocks",
        color: "amber",
        descAr: "إبنِ أفكارك من خلال البرمجة المرئية، وتعلّم أساسيات البرمجة بطريقة بسيطة وممتعة.",
        descEn: "Build your ideas through visual coding and master programming fundamentals in an easy, fun way."
      },
      {
        id: "game_dev",
        nameEn: "Game Development",
        nameAr: "تطوير الألعاب",
        icon: "gamepad",
        color: "cyan",
        descAr: "إبدع في تصميم ألعابك الخاصة وتعلّم أساسيات المنطق والتصميم.",
        descEn: "Unleash creativity by designing your own video games and mastering game logic and mechanics."
      },
      {
        id: "design_basics",
        nameEn: "Design Basics",
        nameAr: "أساسيات التصميم",
        icon: "palette",
        color: "pink",
        descAr: "اكتشف أساسيات التصميم وتعلّم كيف تحوّل أفكارك إلى رسومات بصرية مميزة.",
        descEn: "Discover core visual design principles and learn how to translate creative ideas into stunning artwork."
      }
    ],
    // Exact Schedule Matrix from the poster
    scheduleMatrix: [
      {
        timeEn: "8:00 AM - 9:00 AM",
        timeAr: "8:00 - 9:00 صباحاً",
        slots: {
          A: "design_basics",
          B: "emotional_intelligence",
          C: "game_dev",
          D: "block_programming"
        }
      },
      {
        timeEn: "9:00 AM - 10:00 AM",
        timeAr: "9:00 - 10:00 صباحاً",
        slots: {
          A: "emotional_intelligence",
          B: "game_dev",
          C: "block_programming",
          D: "design_basics"
        }
      },
      {
        timeEn: "10:00 AM - 11:00 AM",
        timeAr: "10:00 - 11:00 صباحاً",
        slots: {
          A: "game_dev",
          B: "block_programming",
          C: "design_basics",
          D: "emotional_intelligence"
        }
      },
      {
        timeEn: "11:00 AM - 12:00 PM",
        timeAr: "11:00 صباحاً - 12:00 ظهراً",
        slots: {
          A: "block_programming",
          B: "design_basics",
          C: "emotional_intelligence",
          D: "game_dev"
        }
      }
    ]
  }
};
