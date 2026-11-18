type ReplaceEntry = {
    from: string,
    to: string
}

type acInfDiffMap = {
    from: string,
    to: string
}

export const replaceCharacters: ReplaceEntry[] = [
    // sample (基本的には https://chinimuruhi.github.io/IIDX-Data-Table/manual/replace-characters.json で解決済み)
    {
        from: 'à',
        to: 'a'
    }
]

// 公式CSV表記（ダブルクォートなし）→ textage正規化キー（ダブルクォートあり）
export const replaceTitle: ReplaceEntry[] = [
    {
        from: 'Anisakis -somatic mutation typeForza-',
        to: 'Anisakis -somatic mutation type"Forza"-'
    },
    {
        from: 'JOURNEY TO FANTASICA (IIDX LIMITED )',
        to: 'JOURNEY TO "FANTASICA" (IIDX LIMITED)'
    },
    {
        from: 'satellite020712 from CODED ARMS',
        to: 'satellite020712 from "CODED ARMS"'
    },
    {
        from: "You'll say Now!",
        to: 'You\'ll say "Now!"'
    },
    {
        from: '水上の提督(Short mix from 幻想水滸伝V)',
        to: '水上の提督(Short mix from "幻想水滸伝V")'
    }
]


// ACとINFで異なる譜面が収録されているリスト(keyがINFのID、valueがACのID)
export const acInfDiffMap:  { [key: number]: any } = {
    1833: { // New Castle Legions
        acID: 1877,
        changedChart: [
            'SPN',
            'SPH',
            'SPA',
            'DPN',
            'DPH',
            'DPA'
        ]
    },
    1646: { // ミッドナイト堕天使
        acID: 1656,
        changedChart: [
            'SPA',
            'DPA'
        ]
    },
    1639: { // THE SHINING POLARIS(kors k mix)
        acID: 101644,
        changedChart: [
            'SPN',
            'SPH',
            'SPA',
            'DPN',
            'DPH',
            'DPA'
        ]
    },
    1543: { // soldier's waltz
        acID: 1572,
        changedChart: [
            'SPN',
            'SPH',
            'SPA',
            'DPN',
            'DPH',
            'DPA'
        ]
    },
    1523: { // madrugada
        acID: 1568,
        changedChart: [
            'SPA',
            'DPH',
            'DPA'
        ]
    },
    1315: { // DEEP ROAR
        acID: 1361,
        changedChart: [
            'SPA',
            'DPN',
            'DPH',
            'DPA'
        ]
    },
    938: { // PARANOIA survivor MAX
        acID: 969,
        changedChart: [
            'SPN',
            'SPH',
            'SPA',
            'DPN',
            'DPH',
            'DPA'
        ]
    },
    903: { // ADVANCE
        acID: 970,
        changedChart: [
            'SPN',
            'SPH',
            'SPA',
            'DPN',
            'DPH',
            'DPA'
        ]
    },
    729: { // MAX 300
        acID: 747,
        changedChart: [
            'SPN',
            'SPH',
            'SPA',
            'DPN',
            'DPH',
            'DPA'
        ]
    },
    637: { // VJARMY
        acID: 644,
        changedChart: [
            'SPN',
            'SPH',
            'SPA',
            'DPN',
            'DPH',
            'DPA'
        ]
    },
    621: { // L'amour et la liberte
        acID: 645,
        changedChart: [
            'SPN',
            'SPA',
            'DPN',
            'DPH',
            'DPA'
        ]
    },
}