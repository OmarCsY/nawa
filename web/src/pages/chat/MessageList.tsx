import { Fragment, useEffect, useRef } from 'react'
import { formatDayLong } from '../../lib/format'
import { Bubble, QuickReplies, TypingBubble } from './Bubble'
import { EventCard, ItemsCard, LinkCard, PlanCard, ResultCard } from './cards'
import { chat, type ChatMessage } from './chatStore'
import { VoiceNote } from './VoiceBubble'

function Body({ m }: { m: ChatMessage }) {
  switch (m.kind) {
    case 'voice':
      return m.voice ? <VoiceNote voice={m.voice} /> : null
    case 'items':
      return m.items ? <ItemsCard items={m.items} /> : null
    case 'event':
      return m.event ? <EventCard event={m.event} /> : null
    case 'plan':
      return m.plan ? <PlanCard plan={m.plan} lead={m.text} /> : null
    case 'result':
      return m.result ? <ResultCard result={m.result} /> : null
    case 'link':
      return m.link ? <LinkCard link={m.link} lead={m.text} /> : null
    default:
      return <p className="whitespace-pre-line text-[14.5px] leading-[1.55]">{m.text}</p>
  }
}

const isCard = (m: ChatMessage) => m.kind !== 'text' && m.kind !== 'voice'

export function MessageList({ messages, typing }: { messages: ChatMessage[]; typing: boolean }) {
  const end = useRef<HTMLDivElement>(null)

  // follow the conversation: smooth when new things arrive, no animation for people who asked for less motion
  useEffect(() => {
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    end.current?.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', block: 'end' })
  }, [messages.length, typing])

  return (
    <div
      role="log"
      aria-live="polite"
      aria-label="المحادثة"
      className="min-h-0 flex-1 overflow-y-auto overscroll-contain [scrollbar-width:none] bg-wa-bg bg-[radial-gradient(rgb(11_20_26/0.045)_1px,transparent_1.2px)] bg-[length:18px_18px] px-3 pb-2 pt-3"
    >
      {messages.map((m, i) => {
        const prev = messages[i - 1]
        const day = m.at.slice(0, 10)
        const newDay = day !== prev?.at.slice(0, 10)
        const mine = m.from === 'user'
        const answered = messages.slice(i + 1).some((x) => x.from === 'user')
        return (
          <Fragment key={m.id}>
            {newDay && (
              <p className="numerals mx-auto mt-2 w-fit rounded-lg bg-wa-in/90 px-3 py-1 text-[12px] text-wa-meta shadow-[0_1px_0.5px_rgb(11_20_26/0.1)]">
                {formatDayLong(day)}
              </p>
            )}
            <Bubble
              mine={mine}
              tail={newDay || prev?.from !== m.from}
              at={m.at}
              status={m.status}
              wide={isCard(m) || m.kind === 'voice'}
              onRetry={() => chat.retry(m.id)}
            >
              <Body m={m} />
            </Bubble>
            {m.buttons && m.buttons.length > 0 && (
              <QuickReplies buttons={m.buttons} disabled={answered || typing} onPress={chat.press} />
            )}
          </Fragment>
        )
      })}
      {typing && <TypingBubble />}
      <div ref={end} className="h-px" />
    </div>
  )
}
