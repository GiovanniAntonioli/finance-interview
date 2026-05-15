import { calculateAging } from './aging'

const TODAY = new Date('2026-05-15')

const d = (s: string) => new Date(s)

describe('calculateAging — null dueDate', () => {
  it('returns no-due-date band', () => {
    const r = calculateAging(null, TODAY)
    expect(r.agingDays).toBeNull()
    expect(r.band).toBe('no-due-date')
  })
})

describe('calculateAging — band limits (TEST-01)', () => {
  it('due today → 0 days → current', () => {
    const r = calculateAging(d('2026-05-15'), TODAY)
    expect(r.agingDays).toBe(0)
    expect(r.band).toBe('current')
  })

  it('due in future → negative days → current', () => {
    const r = calculateAging(d('2026-05-22'), TODAY)
    expect(r.agingDays).toBe(-7)
    expect(r.band).toBe('current')
  })

  it('1 day overdue → 1-30', () => {
    const r = calculateAging(d('2026-05-14'), TODAY)
    expect(r.agingDays).toBe(1)
    expect(r.band).toBe('1-30')
  })

  it('30 days overdue → 1-30', () => {
    const r = calculateAging(d('2026-04-15'), TODAY)
    expect(r.agingDays).toBe(30)
    expect(r.band).toBe('1-30')
  })

  it('31 days overdue → 31-60', () => {
    const r = calculateAging(d('2026-04-14'), TODAY)
    expect(r.agingDays).toBe(31)
    expect(r.band).toBe('31-60')
  })

  it('60 days overdue → 31-60', () => {
    const r = calculateAging(d('2026-03-16'), TODAY)
    expect(r.agingDays).toBe(60)
    expect(r.band).toBe('31-60')
  })

  it('61 days overdue → 61-90', () => {
    const r = calculateAging(d('2026-03-15'), TODAY)
    expect(r.agingDays).toBe(61)
    expect(r.band).toBe('61-90')
  })

  it('90 days overdue → 61-90', () => {
    const r = calculateAging(d('2026-02-14'), TODAY)
    expect(r.agingDays).toBe(90)
    expect(r.band).toBe('61-90')
  })

  it('91 days overdue → 90+', () => {
    const r = calculateAging(d('2026-02-13'), TODAY)
    expect(r.agingDays).toBe(91)
    expect(r.band).toBe('90+')
  })

  it('146 days overdue → 90+ (inv_020 fixture)', () => {
    const r = calculateAging(d('2025-12-20'), TODAY)
    expect(r.agingDays).toBe(146)
    expect(r.band).toBe('90+')
  })

  it('inv_001 fixture: due 2026-04-01 → 44 days → 31-60', () => {
    const r = calculateAging(d('2026-04-01'), TODAY)
    expect(r.agingDays).toBe(44)
    expect(r.band).toBe('31-60')
  })
})
