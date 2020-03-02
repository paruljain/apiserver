import * as db from 'mongo'
import * as uuid from 'uuid/v4'
import { updateMany } from 'mongo';

interface Lock {
    name: string,
    queue: {uuid: string, expiration: number}[]
}

function sleep(seconds: number): Promise<void> {
    return new Promise((resolve, reject) => {
        setTimeout(() => {
            resolve()
        }, seconds * 1000)
    })
}

async function deleteLock(name: string, uid: string): Promise<void> {
    await db.updateOne('locks', {name: name}, {
        $pull: {queue: {uuid: uid}}
    })
}

export async function acquire(name: string, timeoutSeconds?: number, periodSeconds?: number): Promise<string> {
    timeoutSeconds = timeoutSeconds || 5
    periodSeconds = periodSeconds || 5
    const uid: string = uuid()
    const result = await db.findOneAndUpdate('locks', {name: name}, {
            $set: {name: name},
            $push: {queue: {expiration: Date.now() + timeoutSeconds * 1000, uuid: uid}},
        },
        {
            upsert: true,
            returnOriginal: false
        }
    )
    //let lock: Lock
    //For some reason MDB does not return the doc when upserted
    //if (!result.value) lock = await db.findOne('locks', {name: name})
    //else lock = result.value
    const lock: Lock = await db.findOne('locks', {name: name})
    //If our lock request is at top of the queue we have acquired the lock
    if (lock.queue[0].uuid === uid) {
        //Set the period after which the lock will automatically expire
        //This is to prevent a lock from being left behind if the process crashes
        await db.updateOne('locks', {name: name},
        { $set: { 'queue.$[element]': {expiration: Date.now() + periodSeconds * 1000} }},
        { arrayFilters: [ { element: 0 } ] })
        return uid
    }
    
    //We are not at the top of the queue. So let's wait to get on the top
    //We will move up automatically as other processes release their locks
    for (let i=0; i<timeoutSeconds; i++) {
        await sleep(1)
        //Remove all locks for this queue (name) that have expired
        const result: Lock = (await db.findOneAndUpdate('locks', {name: name}, {
            $pull: {queue: {expiration: {$lte: Date.now()}}}},
            {returnOriginal: false})
        ).value
        if (!result || !result.queue.length) throw new Error('Timeout')
        if (result.queue[0].uuid === uid) {
            //Set the period after which the lock will automatically expire
            //This is to prevent a lock from being left behind if the process crashes
            await db.updateOne('locks', {name: name},
                { $set: { 'queue.$[element]': {expiration: Date.now() + periodSeconds * 1000} }},
                { arrayFilters: [ { element: 0 } ] }
            )
            return uid
        }
    }
    throw new Error('Timeout')
}

export function release(name: string, uid: string): Promise<void> {
    return deleteLock(name, uid)
}

export async function cleanUp(): Promise<void> {
    const now = Date.now()
    //Delete all requests that have expired
    await db.updateMany('locks', {}, {
        $pull: {queue: {expiration: {$lte: now}}}
    })
    //Delete all locks where there are no queues
    await db.deleteMany('locks', {
        queue: {$size: 0}
    })
}

//Clean up on load
cleanUp()
