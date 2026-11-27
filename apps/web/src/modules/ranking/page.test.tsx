import React from 'react'
import { fireEvent, render, screen, within } from '@testing-library/react'
import {
  FactionCode,
  RankingCategory,
  RankingKind,
  type RankingListDataResponse,
  type RankingMeDataResponse,
} from '@eoneom/api-client'
import { beforeEach, describe, expect, it, vi } from 'vitest'

let listData: RankingListDataResponse
let meData: RankingMeDataResponse

vi.mock('@tanstack/react-router', () => ({
  Link: ({ children, to, search, params }: {
    children: React.ReactNode
    to: string
    search?: Record<string, string>
    params?: Record<string, string>
  }) => (
    <a href={`${to}?${new URLSearchParams({ ...search, ...params }).toString()}`}>{children}</a>
  ),
}))
vi.mock('#ranking/hooks', () => ({
  useRankingList: () => ({ data: listData, isPending: false }),
  useRankingMe: () => ({ data: meData }),
}))

import { RankingPage } from './page'

describe('RankingPage', () => {
  beforeEach(() => {
    listData = {
      computed_at: new Date(2026, 10, 27, 14, 7).getTime(),
      category: RankingCategory.GLOBAL,
      kind: RankingKind.PLAYER,
      page: 1,
      page_size: 50,
      total: 120,
      rows: [
        {
          rank: 1,
          rank_change_24h: 2,
          points: 1500,
          entity: { kind: RankingKind.PLAYER, id: 'p1', name: 'Alice', faction_code: FactionCode.THE_CONFEDERATION, alliance_tag: 'ABC' },
        },
        {
          rank: 2,
          rank_change_24h: -1,
          points: 900,
          entity: { kind: RankingKind.PLAYER, id: 'me', name: 'Moi', faction_code: FactionCode.THE_CONFEDERATION, alliance_tag: null },
        },
      ],
    }
    meData = {
      computed_at: listData.computed_at,
      positions: [
        { category: RankingCategory.GLOBAL, kind: RankingKind.PLAYER, entity_id: 'me', rank: 2, rank_change_24h: -1, points: 900, page: 3 },
      ],
    }
  })

  it('shows rank, change, tagged name linking to a letter, faction, points and the update time', () => {
    render(<RankingPage search={{}} onNavigate={vi.fn()} />)

    const rows = screen.getAllByRole('row')
    const alice = within(rows[1])
    expect(alice.getByText('▲2')).toBeInTheDocument()
    expect(alice.getByRole('link', { name: '[ABC] Alice' })).toHaveAttribute('href', expect.stringContaining('/inbox/mail?view=compose&to=Alice'))
    expect(alice.getByText('La confédération')).toBeInTheDocument()
    expect(within(rows[2]).getByText('▼1')).toBeInTheDocument()
    expect(screen.getByText('Mis à jour à 14:07')).toBeInTheDocument()
  })

  it('highlights the caller row and jumps to their page', () => {
    const onNavigate = vi.fn()
    render(<RankingPage search={{}} onNavigate={onNavigate} />)

    const rows = screen.getAllByRole('row')
    expect(rows[2]).toHaveAttribute('aria-current', 'true')
    expect(rows[1]).not.toHaveAttribute('aria-current')

    fireEvent.click(screen.getByRole('button', { name: 'Ma position' }))
    expect(onNavigate).toHaveBeenCalledWith({ category: RankingCategory.GLOBAL, kind: RankingKind.PLAYER, page: 3 })
  })

  it('switches category and kind', () => {
    const onNavigate = vi.fn()
    render(<RankingPage search={{}} onNavigate={onNavigate} />)

    fireEvent.click(screen.getByRole('button', { name: 'Militaire' }))
    expect(onNavigate).toHaveBeenCalledWith({ category: RankingCategory.MILITARY, kind: RankingKind.PLAYER })
    fireEvent.click(screen.getByRole('button', { name: 'Alliances' }))
    expect(onNavigate).toHaveBeenCalledWith({ category: RankingCategory.GLOBAL, kind: RankingKind.ALLIANCE })
  })

  it('links alliances to their public view', () => {
    listData = {
      ...listData,
      kind: RankingKind.ALLIANCE,
      rows: [ {
        rank: 1,
        rank_change_24h: null,
        points: 40,
        entity: { kind: RankingKind.ALLIANCE, id: 'a1', name: 'Les Rouges', tag: 'RGE', member_count: 4 },
      } ],
    }
    render(<RankingPage search={{ kind: RankingKind.ALLIANCE }} onNavigate={vi.fn()} />)

    expect(screen.getByRole('link', { name: '[RGE] Les Rouges' })).toHaveAttribute('href', expect.stringContaining('/alliance/$allianceId?allianceId=a1'))
    expect(screen.getByText('4 membres')).toBeInTheDocument()
  })

  it('explains the empty state before the first snapshot', () => {
    listData = { ...listData, computed_at: null, total: 0, rows: [] }
    meData = { computed_at: null, positions: [] }
    render(<RankingPage search={{}} onNavigate={vi.fn()} />)

    expect(screen.getByText('Le premier classement n\'a pas encore été calculé.')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Ma position' })).toBeDisabled()
  })
})
