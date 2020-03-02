import * as server from 'httpsServer'
import * as db from 'mongo'

const months = ['', 'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

server.get('/api/admin/log/dates', async (req, res) => {
    const result = await db.aggregate('log',
        [
            {
                $project: {year:{$year:'$date'}, month:{$month:'$date'}, day:{$dayOfMonth:'$date'}}
            },
            { $group:
                {
                    _id: null,
                    distinctDate: {$addToSet: {year: '$year', month: '$month', day: '$day'}}
                }
            }
        ]
    )
    const r = result[0].distinctDate
    r.sort((a, b) => {
        if (a.year !== b.year) return a.year - b.year
        if (a.month !== b.month) return a.month - b.month
        if (a.day !== b.day) return a.day - b.day
        return 0
    })

    res.json(r.map(d => months[d.month] + '-' + d.day + '-' + d.year))
})

server.get('/api/admin/log/dates/:date', async (req, res) => {
    const startDate = new Date(req.params.date)
    const endDate = new Date(req.params.date)
    endDate.setDate(endDate.getDate() + 1)
    const result = await db.find('log', {date: {$gte: startDate, $lt: endDate}})
    res.json(result)
})
