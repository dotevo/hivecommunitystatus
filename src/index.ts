import methods from '@hiveio/hive-js/lib/api/methods';

methods.push({
	"api": "bridge",
	"method": "get_discussion",
	"params": ["author", "permlink"]
  });
import * as hive from "@hiveio/hive-js";
import * as util from "util";
//import * as dateFormat from "dateformat";

//console.log(hive);

const getDiscussionsByCreated = util.promisify(hive.api.getDiscussionsByCreated);
const getComments = util.promisify(hive.api.getDiscussion);


function sleep(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms));
}


async function getData(communityName: string, size: number) {
	let start_author: string | undefined;
	let start_permlink: string | undefined;

	let result: any[] = [];
	const iters = size / 30;
	for(let req=0;req<iters;req++) {
		console.log("Receiving posts " + req + " / " + iters);
		console.log(start_author, start_permlink);
		const findPosts = await getDiscussionsByCreated({tag: communityName, limit: 30, start_author: start_author, start_permlink: start_permlink});
		//console.log(findPosts);
		const rec = await Promise.all(findPosts.map(async (el: any) => {
			//console.log("Title" + el.title);
			const comments = Object.values(await getComments(el.author, el.permlink));
			//console.log(comments);
			
			//console.log(comments);
			const dates = comments.map((el:any) => new Date(el.created).getTime());
			const lastComment = dates.length > 0 ? new Date(Math.max.apply(null, dates)) : 0;
			return {title: el.title, permlink: el.permlink, author: el.author,  created: new Date(el.created), comments: {size: comments.length, lastComment: lastComment}};
		})) as any[];
		result = result.concat(rec);
		if(rec.length == 0) {
			break;
		}
		//console.log(result[result.length - 1]);
		start_author = result[result.length - 1].author;
		start_permlink = result[result.length - 1].permlink;

		
		await sleep(2000);
	}

	result.sort((a: any, b:any) => {
		if(a.comments.lastComment < b.comments.lastComment) return 1;
		if(a.comments.lastComment > b.comments.lastComment) return -1;
		return 0;
	})

	var date = new Date();
	let n =0;
	result.forEach((element :any, index: number, array: any[]) => {
/*
		if(element.created > date) {
			console.log();
			console.log("Skipping (new post): " + element.title);
			return;
		}

		if(element.comments.lastComment < date) {
			console.log();
			console.log("Skipping (no new comments): " + element.title);
			return;
		}
		*/

		console.log();
		const title = element.title.replace(/(.{80})..+/, "$1…");
		console.log(index + "." + title.padEnd(80, " ") + ": " + ((date.getTime() - element.created.getTime()) / (1000 * 3600 * 24)).toFixed() + " dni temu");
		if (element.comments.lastComment !== 0) {
			console.log("    last: " + element.comments.lastComment.toISOString() + "    comments: " + element.comments.size);
		}
	});
}

//getData("hive-163456")//
getData("hive-199021", 500)// Sarmatia
//getData("hive-134382",500) // Polish

  