import { useEffect } from 'react'
import { BackstagePanel } from './chat/BackstagePanel'
import { chat, useChat } from './chat/chatStore'
import { Composer } from './chat/Composer'
import { DemoControls } from './chat/DemoControls'
import { MessageList } from './chat/MessageList'
import { ChatHeader, PhoneFrame } from './chat/PhoneFrame'
import { ToastHost } from './chat/ToastHost'

/**
 * Below 768px the chat IS the screen, sized to the visual viewport so the on-screen keyboard never covers the
 * input (iOS doesn't shrink the layout viewport for it). The page behind is locked from scrolling.
 */
function useFullScreenOnPhones() {
  useEffect(() => {
    const root = document.documentElement
    const viewport = window.visualViewport
    const fit = () => {
      root.style.setProperty('--app-h', `${viewport?.height ?? window.innerHeight}px`)
      window.scrollTo(0, 0)
    }
    fit()
    root.classList.add('chat-lock')
    viewport?.addEventListener('resize', fit)
    window.addEventListener('resize', fit)
    return () => {
      viewport?.removeEventListener('resize', fit)
      window.removeEventListener('resize', fit)
      root.classList.remove('chat-lock')
      root.style.removeProperty('--app-h')
    }
  }, [])
}

/** The web version of the WhatsApp bot: same engine, same flow, in a phone on the page. */
export function ChatPage() {
  const { messages, typing, today, turn, toast, isDemo } = useChat()
  useEffect(() => { chat.initialize() }, [])
  useFullScreenOnPhones()

  return (
    <div className="mx-auto flex w-full flex-col max-md:h-[var(--app-h,100dvh)] md:max-w-[25.75rem] lg:grid lg:max-w-none lg:grid-cols-[25.75rem_minmax(0,27rem)] lg:items-start lg:justify-center lg:gap-10">
      <div className="flex min-h-0 flex-1 flex-col md:flex-none">
        {isDemo && <DemoControls today={today} busy={typing} />}
        <PhoneFrame>
          <ChatHeader typing={typing} />
          <MessageList messages={messages} typing={typing} />
          <Composer busy={typing} />
        </PhoneFrame>
      </div>

      <BackstagePanel className="hidden lg:block" turn={turn} typing={typing} />
      <ToastHost toast={toast} />
    </div>
  )
}
