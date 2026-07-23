// app/(marketing)/index.tsx  (or wherever this screen lives in your Expo Router tree)
//
// Port of the Enterprise AI marketing/landing page into the app's real stack:
// React Native + Expo + Expo Router + NativeWind + Redux + TanStack Query.

import React, { useEffect, useMemo, useRef, useState, useCallback } from 'react';

import {
  Animated,
  Easing,
  Linking,
  Platform,
  Pressable,
  ScrollView,
  Image,
  Text,
  View,
  useWindowDimensions,
  Touchable,
} from 'react-native';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import { Menu, ArrowRight, Feather } from 'lucide-react-native';
import Svg, { Path } from 'react-native-svg';

import { useReducedMotion, useTokens, RevealProvider, Reveal, useScrollRevealController } from '../hooks/hooks';
import { PulseDot, BlinkCursor, ConfidenceRibbon } from '../components/components';
import { useRouter } from 'expo-router';

// Platform-aware shadow styling to avoid deprecated shadow* props warnings
const shadowStyle = Platform.select({
  web: {
    boxShadow: '0px 10px 30px rgba(0, 0, 0, 0.08)',
  } as any,
  default: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 5 },
    shadowOpacity: 0.08,
    shadowRadius: 15,
    elevation: 4,
  },
});




// `Github` drop-in inline SVG replacement
const GithubIcon = ({ size = 24, color = '#000' }: { size?: number; color?: string }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Path
      fillRule="evenodd"
      clipRule="evenodd"
      d="M12 2C6.477 2 2 6.477 2 12c0 4.418 2.865 8.166 6.839 9.489.5.092.682-.217.682-.482 0-.237-.009-.868-.013-1.703-2.782.603-3.369-1.342-3.369-1.342-.454-1.154-1.11-1.462-1.11-1.462-.907-.62.069-.608.069-.608 1.003.07 1.531 1.03 1.531 1.03.892 1.529 2.341 1.087 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.11-4.555-4.943 0-1.091.39-1.984 1.029-2.683-.103-.253-.446-1.27.098-2.647 0 0 .84-.269 2.75 1.025A9.578 9.578 0 0 1 12 6.836c.85.004 1.705.114 2.504.336 1.909-1.294 2.747-1.025 2.747-1.025.546 1.377.202 2.394.1 2.647.64.699 1.028 1.592 1.028 2.683 0 3.842-2.339 4.687-4.566 4.935.359.309.678.919.678 1.852 0 1.336-.012 2.415-.012 2.743 0 .267.18.579.688.481C19.138 20.163 22 16.418 22 12c0-5.523-4.477-10-10-10z"
      fill={color}
    />
  </Svg>
);

const REPO_URL = 'https://github.com/BILALAKRAM27/Enterprise-AI';
const SETUP_URL = 'https://github.com/BILALAKRAM27/Enterprise-AI#running-the-project';
const PORTFOLIO_URL = 'https://bilalakram27.github.io/Portfolio';

const NAV_LINKS = [
  { label: 'How it thinks', anchor: 'thesis' },
  { label: 'Pipeline', anchor: 'pipeline' },
  { label: 'Confidence', anchor: 'confidence' },
  { label: 'Stack', anchor: 'stack' },
];

const PIPELINE_STEPS = [
  { n: '01', title: 'Upload', body: 'PDF, DOCX or TXT lands in storage, status set to processing.' },
  { n: '02', title: 'Parse', body: 'Text is pulled out page by page, paragraph by paragraph.' },
  { n: '03', title: 'Chunk', body: 'Split into ~1000-character pieces with overlap, so no idea gets cut in half.' },
  { n: '04', title: 'Embed', body: 'Each chunk becomes a 3072-dimension vector — a fingerprint of its meaning.' },
  { n: '05', title: 'Retrieve', body: 'Your question is embedded too, then matched against every chunk by similarity.' },
  { n: '06', title: 'Generate', body: 'The model answers strictly from what was retrieved — and names its sources.' },
];

const RIBBON_DEMO_CARDS = [
  { file: 'employee-handbook.pdf', snippet: '"New hires accrue 15 days of paid time off in their first year, prorated from the start date."', score: 94 },
  { file: 'q3-security-review.pdf', snippet: '"Access reviews for third-party vendors are conducted on a quarterly basis by the security team."', score: 61 },
  { file: 'vendor-contract.docx', snippet: '"Either party may terminate this agreement with 30 days\' written notice to the other party."', score: 27 },
];

const BACKEND_CHIPS = ['FastAPI', 'PostgreSQL', 'Qdrant', 'Gemini embeddings', 'LangChain splitters', 'PyMuPDF', 'python-docx', 'JWT + bcrypt', 'Tenacity retries', 'Docker Compose'];
const FRONTEND_CHIPS = ['Expo + React Native', 'Expo Router', 'Redux Toolkit', 'React Query', 'NativeWind', 'react-hook-form', 'zod', 'expo-secure-store'];

const STATS = [
  { num: '1000', suffix: '/100', label: 'chars per chunk, with overlap' },
  { num: 'gemini-embedding-001', label: '3072-dim retrieval model', mono: true },
  { num: '8 days', label: 'JWT session length' },
  { num: 'cosine', label: 'similarity metric in Qdrant' },
];

const DEMO_QUERY = 'How many vacation days do new hires get?';
const DEMO_ANSWER = 'New hires accrue 15 days of paid time off in their first year, prorated from their start date, per the employee handbook.';
const DEMO_DOCS = [
  { name: 'employee-handbook.pdf' },
  { name: 'vendor-contract.docx' },
  { name: 'q3-security-review.pdf' },
];
const DEMO_CITATIONS = [
  { name: 'employee-handbook.pdf', score: 92 },
  { name: 'q3-security-review.pdf', score: 74 },
  { name: 'vendor-contract.docx', score: 38 },
];

export default function EnterpriseAILandingScreen() {
  const { isDark } = useTokens();
  const { width } = useWindowDimensions();
  const isWide = width >= 980;
  const [menuOpen, setMenuOpen] = useState(false);

  const { scrollY, containerPageY, containerRef, handleScroll, measureContainer } = useScrollRevealController();
  const [contentHeight, setContentHeight] = useState(1);
  const [viewportHeight, setViewportHeight] = useState(1);
  const progress = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const maxScroll = Math.max(1, contentHeight - viewportHeight);
    const pct = Math.min(100, Math.max(0, (scrollY / maxScroll) * 100));
    Animated.timing(progress, { toValue: pct, duration: 80, useNativeDriver: false }).start();
  }, [scrollY, contentHeight, viewportHeight]);

  const openLink = useCallback((url: string) => Linking.openURL(url), []);
  const router = useRouter();
  const navigateTo = useCallback((path: '/(auth)/login' | '/(auth)/register') => router.push(path), [router]);

  const sectionPositions = useRef<{ [key: string]: number }>({}).current;
  const handleSectionLayout = useCallback((key: string, y: number) => {
    sectionPositions[key] = y;
  }, [sectionPositions]);

  const scrollToAnchor = useCallback((anchor: string) => {
    const y = sectionPositions[anchor];
    if (y !== undefined) {
      (containerRef.current as any)?.scrollTo({ y: Math.max(0, y - 64), animated: true });
    }
  }, [sectionPositions, containerRef]);

  return (
    <View className="flex-1 bg-[#FAFAFA] dark:bg-[#0B0D12]">
      {/* scroll-progress confidence ribbon */}
      <View className="absolute top-0 left-0 right-0 h-[3px] z-50 bg-[#E4E4E7] dark:bg-[#3F3F46]">
        <Animated.View style={{ height: 3, width: progress.interpolate({ inputRange: [0, 100], outputRange: ['0%', '100%'] }) }}>
          <LinearGradient
            colors={isDark ? ['#1B4C48', '#2DD4C6', '#5CE8DB'] : ['#B9EFEA', '#0EA5A5', '#0B8383']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={{ flex: 1 }}
          />
        </Animated.View>
      </View>

      <RevealProvider scrollY={scrollY} containerPageY={containerPageY}>
        <ScrollView
          ref={containerRef as any}
          onLayout={measureContainer}
          onScroll={handleScroll}
          scrollEventThrottle={16}
          onContentSizeChange={(_, h) => setContentHeight(h)}
          contentContainerStyle={{ paddingTop: 3 }}
          className="flex-1"
        >
          <View onLayout={(e) => setViewportHeight(e.nativeEvent.layout.height)} />
          <Hero isWide={isWide} openLink={openLink} navigateTo={navigateTo} />
          <View onLayout={(e) => handleSectionLayout('thesis', e.nativeEvent.layout.y)}>
            <ThesisSection />
          </View>
          <View onLayout={(e) => handleSectionLayout('pipeline', e.nativeEvent.layout.y)}>
            <PipelineSection />
          </View>
          <View onLayout={(e) => handleSectionLayout('confidence', e.nativeEvent.layout.y)}>
            <ConfidenceSection />
          </View>
          <View onLayout={(e) => handleSectionLayout('stack', e.nativeEvent.layout.y)}>
            <StackSection isWide={isWide} />
          </View>
          <StatsSection isWide={isWide} />
          <CtaSection openLink={openLink} navigateTo={navigateTo} />
          <Footer isWide={isWide} openLink={openLink} />
        </ScrollView>
      </RevealProvider>

      {/* fixed nav */}
      <BlurView
        intensity={40}
        tint={isDark ? 'dark' : 'light'}
        className="absolute top-[3px] left-0 right-0 z-40 border-b border-[#E4E4E7] dark:border-[#23262f]"
      >
        <View className="flex-row items-center justify-between h-16 px-6 max-w-[1180px] w-full mx-auto">
          <View className="flex-row items-center gap-2.5">
            <Image
              source={require('../../frontend/assets/images/logo.png')}
              style={{ width: 90, height: 90, borderRadius: 100, marginLeft: -30, marginRight: -25, }}
              resizeMode="contain"
            />
            <Text className="font-bold text-[17px] text-[#18181B] dark:text-[#FAFAFA]">Enterprise AI</Text>
          </View>

          {isWide ? (
            <View className="flex-row items-center gap-7">
              {NAV_LINKS.map((l) => (
                <Pressable
                  key={l.anchor}
                  onPress={() => scrollToAnchor(l.anchor)}
                  className="active:opacity-70"
                >
                  <Text className="text-sm font-medium text-[#71717A] dark:text-[#9C9CA6]">
                    {l.label}
                  </Text>
                </Pressable>
              ))}
            </View>
          ) : null}

          <View className="flex-row items-center gap-3">
            {isWide ? (
              <Pressable
                onPress={() => openLink(REPO_URL)}
                className="flex-row items-center gap-2 px-4 py-2.5 rounded-[10px] border border-[#D4D4D8] dark:border-[#33363f] active:opacity-70"
              >
                <GithubIcon size={15} color={isDark ? '#FAFAFA' : '#18181B'} />
                <Text className="text-sm font-semibold text-[#18181B] dark:text-[#FAFAFA]">GitHub</Text>
              </Pressable>
            ) : null}
            <Pressable
              onPress={() => router.push('/(auth)/login')}
              className="px-4 py-2.5 rounded-[10px] bg-[#3652E3] dark:bg-[#6E85FF] active:opacity-80"
            >
              <Text className="text-sm font-semibold text-white">Get started</Text>
            </Pressable>
            {!isWide ? (
              <Pressable onPress={() => setMenuOpen((v) => !v)} className="p-2" accessibilityLabel="Toggle menu">
                <Menu size={22} color={isDark ? '#FAFAFA' : '#18181B'} />
              </Pressable>
            ) : null}
          </View>
        </View>

        {!isWide && menuOpen ? (
          <View className="px-6 pb-3 border-t border-[#E4E4E7] dark:border-[#23262f]">
            {NAV_LINKS.map((l) => (
              <Pressable
                key={l.anchor}
                onPress={() => {
                  setMenuOpen(false);
                  scrollToAnchor(l.anchor);
                }}
                className="py-3 border-b border-[#E4E4E7] dark:border-[#23262f]"
              >
                <Text className="text-[#18181B] dark:text-[#FAFAFA] font-medium">{l.label}</Text>
              </Pressable>
            ))}
          </View>
        ) : null}
      </BlurView>
    </View>
  );
}

/* ------------------------------------------------------------------ */
/* Layout Helper Section Components                                   */
/* ------------------------------------------------------------------ */

function Section({ id, eyebrow, title, children }: { id: string; eyebrow: string; title: string; children: React.ReactNode }) {
  return (
    <View id={id} className="px-6 py-16 max-w-[1180px] w-full mx-auto">
      <Text className="font-mono text-xs font-medium tracking-widest uppercase text-[#0EA5A5] dark:text-[#2DD4C6] mb-2">{eyebrow}</Text>
      <Text className="text-3xl font-extrabold text-[#18181B] dark:text-[#FAFAFA] mb-3">{title}</Text>
      {children}
    </View>
  );
}

function SectionBody({ children }: { children: React.ReactNode }) {
  return <Text className="text-base leading-7 text-[#71717A] dark:text-[#9C9CA6] max-w-[720px]">{children}</Text>;
}

/* ------------------------------------------------------------------ */
/* Hero + animated demo                                               */
/* ------------------------------------------------------------------ */

function Hero({ isWide, openLink, navigateTo }: { isWide: boolean; openLink: (u: string) => void; navigateTo: (p: '/(auth)/login' | '/(auth)/register') => void }) {
  return (
    <View className="px-6 pt-[168px] pb-24 max-w-[1180px] w-full mx-auto" style={!isWide ? { paddingTop: 132, paddingBottom: 64 } : undefined}>
      <View className={isWide ? 'flex-row items-center gap-16' : 'flex-col gap-12'}>
        <View style={isWide ? { flex: 1.05 } : undefined}>
          <Text className="font-mono text-xs font-medium tracking-widest uppercase text-[#0EA5A5] dark:text-[#2DD4C6]">
            Retrieval-augmented knowledge assistant
          </Text>
          <Text className="mt-4 font-extrabold text-[#18181B] dark:text-[#FAFAFA]" style={{ fontSize: isWide ? 52 : 36, lineHeight: isWide ? 56 : 40 }}>
            Ask your documents anything.{' '}
            <Text className="text-[#0B8383] dark:text-[#2DD4C6]">Get an answer you can check.</Text>
          </Text>
          <Text className="mt-5 text-lg leading-7 text-[#71717A] dark:text-[#9C9CA6]" style={{ maxWidth: 480 }}>
            Upload PDFs, Word docs, and text files. Enterprise AI reads them, remembers them, and answers your
            questions in plain language — every claim traced back to the exact source and scored for how confident it
            is.
          </Text>

          <View className="flex-row flex-wrap items-center gap-3.5 mt-9">
            <Pressable
              onPress={() => navigateTo('/(auth)/login')}
              className="flex-row items-center gap-2 px-[18px] py-[10px] rounded-[10px] bg-[#3652E3] dark:bg-[#6E85FF] active:opacity-80"
            >
              <Text className="text-sm font-semibold text-white">Sign in</Text>
              <ArrowRight size={15} color="#fff" />
            </Pressable>
            <Pressable
              onPress={() => navigateTo('/(auth)/register')}
              className="px-[18px] py-[10px] rounded-[10px] border border-[#D4D4D8] dark:border-[#33363f] active:opacity-70"
            >
              <Text className="text-sm font-semibold text-[#18181B] dark:text-[#FAFAFA]">Create account</Text>
            </Pressable>
            <Pressable
              onPress={() => openLink(REPO_URL)}
              className="px-[18px] py-[10px] active:opacity-70"
            >
              <Text className="text-sm font-medium text-[#71717A] dark:text-[#9C9CA6]">View source ↗</Text>
            </Pressable>
          </View>

          <View className="flex-row flex-wrap gap-6 mt-11">
            {[
              ['3072', 'dims per chunk'],
              ['Top-5', 'retrieved per query'],
              ['3', 'model fallback chain'],
              ['iOS · Android · Web', 'one codebase'],
            ].map(([n, l]) => (
              <View key={l}>
                <Text className="font-display font-bold text-xl text-[#18181B] dark:text-[#FAFAFA]">{n}</Text>
                <Text className="font-mono text-xs text-[#71717A] dark:text-[#9C9CA6]">{l}</Text>
              </View>
            ))}
          </View>
        </View>

        <View style={isWide ? { flex: 0.95 } : undefined}>
          <HeroDemo />
        </View>
      </View>
    </View>
  );
}

function HeroDemo() {
  const { isDark } = useTokens();
  const reduced = useReducedMotion();
  const [queryText, setQueryText] = useState('');
  const [answerText, setAnswerText] = useState('');
  const [showStatus, setShowStatus] = useState(false);
  const [showAnswer, setShowAnswer] = useState(false);
  const [visibleCitations, setVisibleCitations] = useState(0);
  const timers = useRef<any[]>([]);

  const clearTimers = () => {
    timers.current.forEach(clearTimeout);
    timers.current = [];
  };
  const after = (fn: () => void, ms: number) => {
    const t = setTimeout(fn, ms);
    timers.current.push(t);
    return t;
  };

  const typeInto = (full: string, speed: number, setter: (s: string) => void, done: () => void) => {
    if (reduced) {
      setter(full);
      done();
      return;
    }
    let i = 0;
    const step = () => {
      setter(full.slice(0, i));
      i++;
      if (i <= full.length) after(step, speed);
      else done();
    };
    step();
  };

  const runDemo = useCallback(() => {
    clearTimers();
    setQueryText('');
    setAnswerText('');
    setShowStatus(false);
    setShowAnswer(false);
    setVisibleCitations(0);

    typeInto(DEMO_QUERY, 32, setQueryText, () => {
      after(() => {
        setShowStatus(true);
        after(() => {
          setShowStatus(false);
          setShowAnswer(true);
          typeInto(DEMO_ANSWER, 16, setAnswerText, () => {
            DEMO_CITATIONS.forEach((_, i) => after(() => setVisibleCitations((v) => Math.max(v, i + 1)), i * 160));
            after(runDemo, 4600);
          });
        }, reduced ? 0 : 1400);
      }, 300);
    });
  }, [reduced]);

  useEffect(() => {
    if (reduced) {
      setQueryText(DEMO_QUERY);
      setAnswerText(DEMO_ANSWER);
      setShowAnswer(true);
      setVisibleCitations(DEMO_CITATIONS.length);
      return;
    }
    runDemo();
    return clearTimers;
  }, [reduced]);

  return (
    <View className="rounded-2xl overflow-hidden border border-[#E4E4E7] dark:border-[#23262f] bg-white dark:bg-[#14161c]" style={shadowStyle}>
      <View className="flex-row items-center gap-2 px-4 py-3 border-b border-[#E4E4E7] dark:border-[#23262f] bg-[#F7F7F8] dark:bg-[#101215]">
        <View className="w-[9px] h-[9px] rounded-full bg-[#D4D4D8] dark:bg-[#33363f]" />
        <View className="w-[9px] h-[9px] rounded-full bg-[#D4D4D8] dark:bg-[#33363f]" />
        <View className="w-[9px] h-[9px] rounded-full bg-[#D4D4D8] dark:bg-[#33363f]" />
        <Text className="ml-2 font-mono text-xs text-[#71717A] dark:text-[#9C9CA6]">knowledge-base — chat</Text>
      </View>

      <View className="p-5 gap-4" style={{ minHeight: 340 }}>
        <View className="flex-row flex-wrap gap-2">
          {DEMO_DOCS.map((d) => (
            <View key={d.name} className="flex-row items-center gap-1.5 border border-[#E4E4E7] dark:border-[#23262f] rounded-lg px-2.5 py-1.5 bg-[#FFFFFF] dark:bg-[#191c24]">
              <View className="w-1.5 h-1.5 rounded-full bg-[#1B8A3D] dark:bg-[#4ADE80]" />
              <Text className="font-mono text-[11px] text-[#71717A] dark:text-[#9C9CA6]">{d.name}</Text>
            </View>
          ))}
        </View>

        <View className="self-end bg-[#EEF1FF] dark:bg-[#161B33] border border-[#3652E3]/30 dark:border-[#6E85FF]/35 rounded-xl px-3.5 py-3" style={{ maxWidth: '88%', minHeight: 20 }}>
          <View className="flex-row flex-wrap items-center">
            <Text className="text-sm text-[#18181B] dark:text-[#FAFAFA]">{queryText}</Text>
            {queryText.length < DEMO_QUERY.length ? <BlinkCursor color={isDark ? '#8C9AFF' : '#2A3FB8'} /> : null}
          </View>
        </View>

        {showStatus ? (
          <View className="flex-row items-center gap-2">
            <PulseDot />
            <Text className="font-mono text-xs text-[#0EA5A5] dark:text-[#2DD4C6]">Searching 3 documents…</Text>
          </View>
        ) : null}

        {showAnswer ? (
          <View className="bg-[#F7F7F8] dark:bg-[#191c24] border border-[#E4E4E7] dark:border-[#23262f] rounded-xl px-4 py-3.5" style={{ minHeight: 20 }}>
            <View className="flex-row flex-wrap items-center">
              <Text className="text-sm text-[#18181B] dark:text-[#FAFAFA]">{answerText}</Text>
              {answerText.length < DEMO_ANSWER.length ? <BlinkCursor /> : null}
            </View>
          </View>
        ) : null}

        <View className="flex-row flex-wrap gap-2.5">
          {DEMO_CITATIONS.map((c, i) => (
            <CiteCard key={c.name} name={c.name} score={c.score} visible={i < visibleCitations} />
          ))}
        </View>
      </View>
    </View>
  );
}

function CiteCard({ name, score, visible }: { name: string; score: number; visible: boolean }) {
  const opacity = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(8)).current;
  const reduced = useReducedMotion();

  useEffect(() => {
    if (!visible) return;
    if (reduced) {
      opacity.setValue(1);
      translateY.setValue(0);
      return;
    }
    Animated.parallel([
      Animated.timing(opacity, { toValue: 1, duration: 400, useNativeDriver: true }),
      Animated.timing(translateY, { toValue: 0, duration: 400, useNativeDriver: true }),
    ]).start();
  }, [visible]);

  return (
    <Animated.View
      style={{ opacity, transform: [{ translateY }], flexGrow: 1, minWidth: 150 }}
      className="bg-[#F7F7F8] dark:bg-[#191c24] border border-[#E4E4E7] dark:border-[#23262f] rounded-[10px] overflow-hidden"
    >
      <ConfidenceRibbon score={score} />
      <View className="px-3 pt-2.5 pb-2">
        <Text numberOfLines={1} className="font-mono text-[11px] font-medium text-[#18181B] dark:text-[#FAFAFA]">
          {name}
        </Text>
        <Text className="font-mono text-[11px] text-[#71717A] dark:text-[#9C9CA6] mt-1">match {score}%</Text>
      </View>
    </Animated.View>
  );
}

/* ------------------------------------------------------------------ */
/* Thesis (Ink vs Signal)                                             */
/* ------------------------------------------------------------------ */

function ThesisSection() {
  return (
    <Section id="thesis" eyebrow="Two colors, two jobs" title="The product decides. The AI proposes.">
      <SectionBody>
        Every screen keeps one distinction visible at a glance: what the interface does versus what the model says.
        That's not a style choice — it's how you know when to trust your own reading and when to check the source.
      </SectionBody>
      <View className="flex-row flex-wrap gap-6 mt-6">
        <Reveal style={{ flexGrow: 1, minWidth: 280 }}>
          <View className="border border-[#E4E4E7] dark:border-[#23262f] rounded-2xl p-8 bg-white dark:bg-[#14161c]">
            <View className="flex-row items-center gap-2.5 mb-2.5">
              <View className="w-3 h-3 rounded-full bg-[#3652E3] dark:bg-[#6E85FF]" />
              <Text className="text-[22px] font-bold text-[#18181B] dark:text-[#FAFAFA]">Ink</Text>
            </View>
            <Text className="text-[15px] leading-6 text-[#71717A] dark:text-[#9C9CA6]">
              Navigation, uploads, buttons, structure. Static and confident — it never moves on its own, because the
              product isn't guessing. Indigo, the color of a decision already made.
            </Text>
            <View className="self-start mt-4 px-2.5 py-1 rounded-md bg-[#EEF1FF] dark:bg-[#161B33]">
              <Text className="font-mono text-[11px] tracking-wide text-[#2A3FB8] dark:text-[#AAB6FF]">STRUCTURE · STATIC</Text>
            </View>
          </View>
        </Reveal>
        <Reveal style={{ flexGrow: 1, minWidth: 280 }} delay={120}>
          <View className="border border-[#E4E4E7] dark:border-[#23262f] rounded-2xl p-8 bg-white dark:bg-[#14161c]">
            <View className="flex-row items-center gap-2.5 mb-2.5">
              <PulseDot size={12} />
              <Text className="text-[22px] font-bold text-[#18181B] dark:text-[#FAFAFA]">Signal</Text>
            </View>
            <Text className="text-[15px] leading-6 text-[#71717A] dark:text-[#9C9CA6]">
              Thinking indicators, streaming answers, citation confidence. The only color allowed to pulse or glow —
              because it's carrying something probabilistic, alive, and accountable to a source.
            </Text>
            <View className="self-start mt-4 px-2.5 py-1 rounded-md bg-[#E6FBF9] dark:bg-[#0E2624]">
              <Text className="font-mono text-[11px] tracking-wide text-[#0B8383] dark:text-[#5CE8DB]">RETRIEVED · ANIMATED</Text>
            </View>
          </View>
        </Reveal>
      </View>
    </Section>
  );
}

/* ------------------------------------------------------------------ */
/* Pipeline                                                           */
/* ------------------------------------------------------------------ */

function PipelineSection() {
  const { width } = useWindowDimensions();
  const isWide = width >= 980;
  const cols = isWide ? 6 : width >= 720 ? 3 : 2;
  const fill = useRef(new Animated.Value(0)).current;
  const [activeCount, setActiveCount] = useState(0);
  const reduced = useReducedMotion();
  const started = useRef(false);

  const start = useCallback(() => {
    if (started.current) return;
    started.current = true;
    if (reduced) {
      fill.setValue(1);
      setActiveCount(PIPELINE_STEPS.length);
      return;
    }
    Animated.timing(fill, { toValue: 1, duration: 1400, easing: Easing.out(Easing.cubic), useNativeDriver: false }).start();
    PIPELINE_STEPS.forEach((_, i) => setTimeout(() => setActiveCount((v) => Math.max(v, i + 1)), i * 220));
  }, [reduced]);

  return (
    <Section id="pipeline" eyebrow="One document, six steps" title="From a PDF on your desk to a cited answer in chat.">
      <SectionBody>
        Nothing is retrieved from the model's memory. Every answer is assembled at query time from what's actually in
        your files — that's what keeps it from making things up.
      </SectionBody>

      <Reveal onReveal={start}>
        {isWide ? (
          <View className="h-0.5 bg-[#E4E4E7] dark:bg-[#23262f] rounded-full mb-4 overflow-hidden" style={{ marginTop: 23 }}>
            <Animated.View style={{ height: 2, width: fill.interpolate({ inputRange: [0, 1], outputRange: ['0%', '100%'] }) }}>
              <LinearGradient colors={['#1B4C48', '#2DD4C6']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={{ flex: 1 }} />
            </Animated.View>
          </View>
        ) : null}
        <View className="flex-row flex-wrap" style={{ marginTop: isWide ? -8 : 8 }}>
          {PIPELINE_STEPS.map((step, i) => (
            <View key={step.n} style={{ width: `${100 / cols}%`, paddingHorizontal: 8, marginBottom: 28 }}>
              <View className="items-center">
                <View
                  className={`w-[46px] h-[46px] rounded-full items-center justify-center border-[1.5px] bg-white dark:bg-[#14161c] ${activeCount > i ? 'border-[#0EA5A5] dark:border-[#2DD4C6]' : 'border-[#D4D4D8] dark:border-[#33363f]'
                    }`}
                >
                  <Text className={`font-mono text-[13px] font-semibold ${activeCount > i ? 'text-[#0B8383] dark:text-[#5CE8DB]' : 'text-[#71717A] dark:text-[#9C9CA6]'}`}>
                    {step.n}
                  </Text>
                </View>
                <Text className="text-center font-semibold text-[14.5px] mt-3 mb-1.5 text-[#18181B] dark:text-[#FAFAFA]">{step.title}</Text>
                <Text className="text-center text-xs leading-5 text-[#71717A] dark:text-[#9C9CA6]">{step.body}</Text>
              </View>
            </View>
          ))}
        </View>
      </Reveal>
    </Section>
  );
}

/* ------------------------------------------------------------------ */
/* Confidence deep dive                                               */
/* ------------------------------------------------------------------ */

function ConfidenceSection() {
  const { width } = useWindowDimensions();
  const isWide = width >= 980;
  return (
    <Section id="confidence" eyebrow="The confidence ribbon" title="Trust, made visible before you read a word.">
      <SectionBody>
        Every citation card carries a hairline across its top edge. Its color and width track the retrieval score
        directly — a pale, thin line means a loose match; a full, saturated line means the answer is standing on
        solid ground.
      </SectionBody>
      <View className={isWide ? 'flex-row gap-5 mt-6' : 'gap-4 mt-6'}>
        {RIBBON_DEMO_CARDS.map((c, i) => (
          <Reveal key={c.file} delay={i * 100} style={isWide ? { flex: 1 } : undefined}>
            <View className="bg-white dark:bg-[#14161c] border border-[#E4E4E7] dark:border-[#23262f] rounded-2xl overflow-hidden">
              <ConfidenceRibbon score={c.score} />
              <View className="p-5">
                <Text className="font-mono text-xs font-medium text-[#18181B] dark:text-[#FAFAFA]">{c.file}</Text>
                <Text className="text-[13.5px] leading-6 text-[#71717A] dark:text-[#9C9CA6] mt-2.5">{c.snippet}</Text>
                <View className="flex-row items-center justify-between mt-4">
                  <Text className="font-mono text-xs text-[#71717A] dark:text-[#9C9CA6]">similarity</Text>
                  <Text className="font-mono text-xs font-semibold text-[#18181B] dark:text-[#FAFAFA]">{c.score}%</Text>
                </View>
              </View>
            </View>
          </Reveal>
        ))}
      </View>
    </Section>
  );
}

/* ------------------------------------------------------------------ */
/* Stack, stats, cta, footer                                          */
/* ------------------------------------------------------------------ */

function StackSection({ isWide }: { isWide: boolean }) {
  return (
    <Section id="stack" eyebrow="Under the hood" title="A thin client, a serious backend.">
      <SectionBody>
        The app on your phone or browser is deliberately simple — it uploads, displays, and renders. Every piece of
        RAG logic lives on the server, where it can be tested, versioned, and trusted.
      </SectionBody>
      <View className={isWide ? 'flex-row gap-8 mt-6' : 'gap-8 mt-6'}>
        <Reveal style={isWide ? { flex: 1 } : undefined}>
          <ChipGroup label="Backend" chips={BACKEND_CHIPS} />
        </Reveal>
        <Reveal style={isWide ? { flex: 1 } : undefined} delay={100}>
          <ChipGroup label="Frontend" chips={FRONTEND_CHIPS} />
        </Reveal>
      </View>
    </Section>
  );
}

function ChipGroup({ label, chips }: { label: string; chips: string[] }) {
  return (
    <View>
      <Text className="font-mono text-xs tracking-wide uppercase text-[#71717A] dark:text-[#9C9CA6] mb-4">{label}</Text>
      <View className="flex-row flex-wrap gap-2.5">
        {chips.map((c) => (
          <View key={c} className="border border-[#E4E4E7] dark:border-[#23262f] rounded-[9px] px-3.5 py-2.5 bg-white dark:bg-[#14161c]">
            <Text className="text-[13.5px] font-medium text-[#18181B] dark:text-[#FAFAFA]">{c}</Text>
          </View>
        ))}
      </View>
    </View>
  );
}

function StatsSection({ isWide }: { isWide: boolean }) {
  return (
    <View className="border-t border-b border-[#E4E4E7] dark:border-[#23262f] py-16">
      <View className={`px-6 max-w-[1180px] w-full mx-auto flex-row flex-wrap ${isWide ? 'gap-8' : 'gap-6'}`}>
        {STATS.map((s) => (
          <Reveal key={s.label} style={{ width: isWide ? '22%' : '46%' }}>
            <Text className={`font-mono font-semibold text-[#18181B] dark:text-[#FAFAFA]`} style={{ fontSize: s.mono ? 15 : 28 }}>
              {s.num}
              {s.suffix ? <Text className="text-[#0EA5A5] dark:text-[#2DD4C6]">{s.suffix}</Text> : null}
            </Text>
            <Text className="mt-2 text-[13px] text-[#71717A] dark:text-[#9C9CA6]">{s.label}</Text>
          </Reveal>
        ))}
      </View>
    </View>
  );
}

function CtaSection({ openLink, navigateTo }: { openLink: (u: string) => void; navigateTo: (p: '/(auth)/login' | '/(auth)/register') => void }) {
  return (
    <View className="items-center py-[100px] px-6">
      <Reveal style={{ alignItems: 'center' }}>
        <Text className="font-extrabold text-center text-[#18181B] dark:text-[#FAFAFA]" style={{ fontSize: 34, maxWidth: 680 }}>
          Stop searching your files. Start asking them.
        </Text>
        <Text className="mt-4 text-center text-[#71717A] dark:text-[#9C9CA6]">
          Clone the repo, bring your own Gemini key, and point it at your first document.
        </Text>
        <View className="flex-row flex-wrap items-center justify-center gap-3.5 mt-8">
          <Pressable onPress={() => navigateTo('/(auth)/login')} className="px-[18px] py-[10px] rounded-[10px] bg-[#3652E3] dark:bg-[#6E85FF] active:opacity-80">
            <Text className="text-sm font-semibold text-white">Get Started</Text>
          </Pressable>
          <Pressable onPress={() => openLink(SETUP_URL)} className="px-[18px] py-[10px] rounded-[10px] border border-[#D4D4D8] dark:border-[#33363f] active:opacity-70">
            <Text className="text-sm font-semibold text-[#18181B] dark:text-[#FAFAFA]">Setup Guide</Text>
          </Pressable>
          <Pressable
            onPress={() =>
              openLink(
                "https://github.com/BILALAKRAM27/Enterprise-AI/releases/download/v1.0.0/application-ae8e9929-0bd4-4909-81bb-e6de6b3f960c.apk"
              )
            }
            className="flex-row items-center gap-2 px-[18px] py-[10px] rounded-[10px] border border-[#D4D4D8] dark:border-[#33363f] active:opacity-70"
          >
            <Image
              source={require("../../frontend/assets/images/android.png")}
              className="w-8 h-8"
              style={{ width: 32, height: 32 }}
              resizeMode="contain"
            />

            <Text className="text-sm font-semibold text-[#18181B] dark:text-[#FAFAFA]">
              Get the App
            </Text>
          </Pressable>
        </View>
      </Reveal>
    </View>
  );
}

function Footer({ isWide, openLink }: { isWide: boolean; openLink: (u: string) => void }) {
  return (
    <View className="border-t border-[#E4E4E7] dark:border-[#23262f] py-8 px-6">
      <View className={`max-w-[1180px] w-full mx-auto flex-row items-center justify-between ${!isWide ? 'flex-col gap-4 items-start' : ''}`}>
        <Text className="text-xs text-[#71717A] dark:text-[#9C9CA6]">
          Enterprise AI
        </Text>
        <View className="flex-row items-center gap-6">
          <Pressable onPress={() => openLink(PORTFOLIO_URL)}>
            <Text className="text-xs text-[#1abdbd]">Portfolio ↗</Text>
          </Pressable>
          <Pressable onPress={() => openLink(REPO_URL)}>
            <Text className="text-xs text-[#1abdbd]">GitHub ↗</Text>
          </Pressable>
        </View>
      </View>
    </View>
  );
}